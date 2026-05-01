import { supabase } from './supabase/supabaseClient';
import { AuthResponse, LoginCredentials, Profile } from '../types/auth';

export class AuthService {
  private static readonly SIGN_OUT_NETWORK_MS = 12000;
  /** If updateUser never resolves (common when auth listener blocks the client), stop waiting and verify. */
  private static readonly PASSWORD_UPDATE_WAIT_MS = 10000;
  private static readonly PASSWORD_LOCK_DRAIN_WAIT_MS = 300;
  private static readonly CHANGE_PASSWORD_TOTAL_WAIT_MS = 10000;

  /** Ensures the next auth call waits until a prior password `updateUser` finishes (same processLock as getSession). */
  private static inFlightPasswordUpdate: Promise<void> | null = null;

  private static async drainInFlightPasswordUpdate(): Promise<void> {
    const inFlight = AuthService.inFlightPasswordUpdate;
    if (!inFlight) return;

    await Promise.race([
      inFlight,
      new Promise<void>((resolve) =>
        setTimeout(resolve, AuthService.PASSWORD_LOCK_DRAIN_WAIT_MS)
      ),
    ]).catch(() => {});

    if (AuthService.inFlightPasswordUpdate === inFlight) {
      AuthService.inFlightPasswordUpdate = null;
    }
  }

  private static async updateUserPasswordWithDeadline(
    newPassword: string
  ): Promise<
    | { kind: 'ok'; error: { message?: string } | null }
    | { kind: 'timeout' }
    | { kind: 'thrown' }
  > {
    try {
      const updatePromise = supabase.auth.updateUser({ password: newPassword });
      const tracked = updatePromise
        .then(() => undefined)
        .catch(() => undefined);
      const completion = tracked.finally(() => {
        if (AuthService.inFlightPasswordUpdate === completion) {
          AuthService.inFlightPasswordUpdate = null;
        }
      });
      AuthService.inFlightPasswordUpdate = completion;

      const result = await Promise.race([
        updatePromise.then((r) => ({
          kind: 'ok' as const,
          error: r.error,
        })),
        new Promise<{ kind: 'timeout' }>((resolve) =>
          setTimeout(() => resolve({ kind: 'timeout' }), this.PASSWORD_UPDATE_WAIT_MS)
        ),
      ]);
      return result;
    } catch {
      return { kind: 'thrown' };
    }
  }

  private static getFriendlyLoginError(message?: string): string {
    if (!message) return 'Login failed. Please try again.';
    const normalized = message.toLowerCase();

    if (
      normalized.includes('invalid login credentials') ||
      normalized.includes('invalid credentials') ||
      normalized.includes('email not confirmed') ||
      normalized.includes('invalid_grant') ||
      normalized.includes('grant_type=password') ||
      normalized.includes('token') && normalized.includes('400')
    ) {
      return 'Incorrect email or password.';
    }

    if (normalized.includes('network request failed') || normalized.includes('failed to fetch')) {
      return 'Unable to reach server. Please check your internet connection.';
    }

    return message;
  }

  private static isInvalidRefreshTokenError(error: any): boolean {
    const message = error?.message || '';
    return (
      message.includes('Invalid Refresh Token') ||
      message.includes('Refresh Token Not Found') ||
      message.includes('Invalid session')
    );
  }

  static subscribeToAuthChanges(
    callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]
  ) {
    return supabase.auth.onAuthStateChange(callback);
  }
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) {
        return {
          success: false,
          error: this.getFriendlyLoginError(authError.message),
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'Authentication failed',
        };
      }

      const profile = await this.fetchProfile(authData.user.id);
      
      if (!profile) {
        // Auto-logout user if profile doesn't exist
        await this.logout();
        return {
          success: false,
          error: 'Profile not found. Please contact your administrator.',
        };
      }

      if (profile.is_blocked) {
        await this.logout();
        return {
          success: false,
          error: profile.blocked_reason || 'Your account has been blocked by an administrator.',
        };
      }

      return {
        success: true,
        user: authData.user,
        profile,
      };
    } catch (error) {
      return {
        success: false,
        error: this.getFriendlyLoginError(error instanceof Error ? error.message : 'Unknown error occurred'),
      };
    }
  }

  static async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.safeLogout();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  static async fetchProfile(userId: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        return null;
      }

      return data as Profile | null;
    } catch (error) {
      console.error('Profile fetch exception:', error);
      return null;
    }
  }

  static async getCurrentUser(): Promise<{ user: any | null; profile: Profile | null }> {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError && this.isInvalidRefreshTokenError(sessionError)) {
        await this.safeLogout();
        return { user: null, profile: null };
      }

      if (!sessionData?.session) {
        return { user: null, profile: null };
      }

      const { data: { user }, error } = await supabase.auth.getUser();
      
      // Handle invalid refresh token errors
      if (error && this.isInvalidRefreshTokenError(error)) {
        await this.safeLogout();
        return { user: null, profile: null };
      }
      
      if (error || !user) {
        return { user: null, profile: null };
      }

      const profile = await this.fetchProfile(user.id);

      if (profile?.is_blocked) {
        await this.safeLogout();
        return { user: null, profile: null };
      }
      
      return {
        user,
        profile,
      };
    } catch (error) {
      if (this.isInvalidRefreshTokenError(error)) {
        await this.safeLogout();
        return { user: null, profile: null };
      }
      console.error('Get current user error:', error);
      return { user: null, profile: null };
    }
  }

  static async safeLogout(): Promise<void> {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('signOut timeout')), this.SIGN_OUT_NETWORK_MS)
        ),
      ]);
    } catch {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {}
    }
  }

  static async changePassword(
    currentPassword: string,
    newPassword: string,
    userEmail?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    return Promise.race([
      this.changePasswordInternal(currentPassword, newPassword, userEmail),
      new Promise<{ success: boolean; error?: string }>((resolve) =>
        setTimeout(
          () => resolve({ success: false, error: 'Password update timed out. Please try again.' }),
          this.CHANGE_PASSWORD_TOTAL_WAIT_MS
        )
      ),
    ]);
  }

  private static async changePasswordInternal(
    currentPassword: string,
    newPassword: string,
    userEmail?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
        return {
          success: false,
          error: 'Missing Supabase configuration',
        };
      }

      await AuthService.drainInFlightPasswordUpdate();

      let email = (userEmail ?? '').trim();

      if (!email) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          return {
            success: false,
            error: 'Your session expired. Please login again.',
          };
        }
        email = (sessionData?.session?.user?.email ?? '').trim();
      }

      if (!email) {
        const {
          data: { user: fallbackUser },
        } = await supabase.auth.getUser();
        email = (fallbackUser?.email ?? '').trim();
      }

      if (!email) {
        return {
          success: false,
          error: 'Unable to verify your account. Please login again.',
        };
      }

      const updateOutcome = await this.updateUserPasswordWithDeadline(newPassword);

      if (updateOutcome.kind === 'timeout') {
        return {
          success: false,
          error: 'Password update is taking too long. Please try again.',
        };
      }

      if (updateOutcome.kind === 'thrown') {
        return {
          success: false,
          error: 'Network is slow. Please try again.',
        };
      }

      const updateError = updateOutcome.error;
      if (!updateError) {
        return { success: true };
      }

      return {
        success: false,
        error: updateError.message || 'Failed to update password',
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update password';
      const m = message.toLowerCase();
      if (m.includes('network request failed') || m.includes('failed to fetch')) {
        return {
          success: false,
          error: 'Network is slow. Please try again.',
        };
      }
      return {
        success: false,
        error: message,
      };
    }
  }
}
