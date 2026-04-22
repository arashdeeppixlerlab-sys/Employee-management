import { supabase } from './supabase/supabaseClient';
import { AuthResponse, LoginCredentials, Profile } from '../types/auth';

export class AuthService {
  private static subscription: any = null;

  static async initializeAuth() {
    // Set up session listener using correct Supabase v2 pattern
    if (!this.subscription) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
      });
      this.subscription = subscription;
    }
  }

  static cleanup() {
    // Safe cleanup with optional chaining
    this.subscription?.unsubscribe();
    this.subscription = null;
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
          error: authError.message,
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
        profile,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
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
      const { data: { user }, error } = await supabase.auth.getUser();
      
      // Handle invalid refresh token errors
      if (error && (
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('Refresh Token Not Found') ||
        error.message?.includes('Invalid session')
      )) {
        console.log('Invalid session detected, clearing auth state');
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
      console.error('Get current user error:', error);
      // Handle network or other errors by clearing session
      await this.safeLogout();
      return { user: null, profile: null };
    }
  }

  static async safeLogout(): Promise<void> {
    try {
      // Clear session without throwing errors
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.log('Logout error (safe to ignore):', error);
    }
  }

  static async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (reauthError) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return {
          success: false,
          error: updateError.message || 'Failed to update password',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update password',
      };
    }
  }
}
