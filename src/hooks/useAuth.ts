import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AuthService } from '../services/AuthService';
import { AuthState, LoginCredentials } from '../types/auth';

type UseAuthReturn = AuthState & {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; profile?: any; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  refreshProfile: () => Promise<boolean>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isEmployee: boolean;
};

const AuthContext = createContext<UseAuthReturn | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const isMounted = useRef(true);
  const hasInitializedRef = useRef(false);
  const profileRequestInFlightRef = useRef<Promise<any> | null>(null);
  const lastProfileFetchAtRef = useRef(0);
  const cachedProfileRef = useRef<any>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const setAuthStateSafe = useCallback((updater: AuthState | ((prev: AuthState) => AuthState)) => {
    if (!isMounted.current) return;
    setAuthState(updater);
  }, []);

  useEffect(() => {
    cachedProfileRef.current = authState.profile;
  }, [authState.profile]);

  useEffect(() => {
    currentUserIdRef.current = authState.user?.id ?? null;
  }, [authState.user?.id]);

  const fetchProfileWithGuard = useCallback(
    async (userId: string, force = false) => {
      const now = Date.now();
      const minIntervalMs = 1500;

      if (!force && profileRequestInFlightRef.current) {
        return profileRequestInFlightRef.current;
      }

      if (!force && now - lastProfileFetchAtRef.current < minIntervalMs) {
        return cachedProfileRef.current;
      }

      const request = AuthService.fetchProfile(userId);
      profileRequestInFlightRef.current = request;
      lastProfileFetchAtRef.current = now;

      try {
        return await request;
      } finally {
        if (profileRequestInFlightRef.current === request) {
          profileRequestInFlightRef.current = null;
        }
      }
    },
    []
  );

  const initializeAuth = useCallback(async () => {
    try {
      const { user, profile } = await AuthService.getCurrentUser();
      setAuthStateSafe({
        user,
        profile,
        loading: false,
        error: null,
      });
    } catch {
      setAuthStateSafe({
        user: null,
        profile: null,
        loading: false,
        error: null,
      });
    } finally {
      hasInitializedRef.current = true;
    }
  }, [setAuthStateSafe]);

  useEffect(() => {
    isMounted.current = true;
    initializeAuth();

    const handleAuthStateChange = async (
      event: Parameters<typeof AuthService.subscribeToAuthChanges>[0] extends (
        ...args: infer A
      ) => any
        ? A[0]
        : never,
      session: Parameters<typeof AuthService.subscribeToAuthChanges>[0] extends (
        ...args: infer A
      ) => any
        ? A[1]
        : never
    ) => {
      try {
        if (!hasInitializedRef.current && !session?.user) {
          return;
        }

        if (!session?.user) {
          setAuthStateSafe((prev) => ({
            user: null,
            profile: null,
            loading: false,
            error: prev.error,
          }));
          return;
        }

        if (event === 'TOKEN_REFRESHED') {
          setAuthStateSafe((prev) => ({
            ...prev,
            user: session.user,
            loading: false,
            error: null,
          }));
          return;
        }

        if ((event as string) === 'USER_UPDATED') {
          setAuthStateSafe((prev) => ({
            ...prev,
            user: session.user,
            loading: false,
            error: null,
          }));
          return;
        }

        const isSameUser = currentUserIdRef.current === session.user.id;
        const hasCachedProfile = !!cachedProfileRef.current;

        if (
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') &&
          isSameUser &&
          hasCachedProfile
        ) {
          setAuthStateSafe((prev) => ({
            ...prev,
            user: session.user,
            profile: cachedProfileRef.current,
            loading: false,
            error: null,
          }));
          return;
        }

        const shouldForceProfileFetch =
          event === 'USER_UPDATED' || (event === 'SIGNED_IN' && !isSameUser);

        await new Promise<void>((resolve) => setTimeout(resolve, 0));

        const profile = await fetchProfileWithGuard(session.user.id, shouldForceProfileFetch);
        setAuthStateSafe((prev) => ({
          ...prev,
          user: session.user,
          profile: profile ?? cachedProfileRef.current ?? prev.profile,
          loading: false,
          error: null,
        }));
      } catch (error) {
        console.error('Auth state change error:', error);
        setAuthStateSafe((prev) => ({
          ...prev,
          user: session?.user ?? prev.user,
          profile: prev.profile ?? cachedProfileRef.current,
          loading: false,
          error: prev.error,
        }));
      }
    };

    const {
      data: { subscription },
    } = AuthService.subscribeToAuthChanges(async (event, session) => {
      void handleAuthStateChange(event, session);
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [initializeAuth, setAuthStateSafe, fetchProfileWithGuard]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setAuthStateSafe((prev) => ({ ...prev, loading: true, error: null }));

      const response = await AuthService.login(credentials);

      if (response.success && response.profile) {
        setAuthStateSafe({
          user: response.user ?? null,
          profile: response.profile,
          loading: false,
          error: null,
        });

        return { success: true, profile: response.profile };
      } else {
        setAuthStateSafe((prev) => ({
          ...prev,
          loading: false,
          error: response.error || 'Login failed',
        }));

        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed';

      setAuthStateSafe((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  }, [setAuthStateSafe]);

  const logout = useCallback(async () => {
    setAuthStateSafe((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await AuthService.logout();

      if (response.success) {
        setAuthStateSafe({
          user: null,
          profile: null,
          loading: false,
          error: null,
        });
        return { success: true };
      }

      setAuthStateSafe((prev) => ({
        ...prev,
        loading: false,
        error: response.error || 'Logout failed',
      }));
      return { success: false, error: response.error };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Logout failed';
      setAuthStateSafe((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      return { success: false, error: errorMessage };
    }
  }, [setAuthStateSafe]);

  const clearError = useCallback(() => {
    setAuthStateSafe((prev) => ({ ...prev, error: null }));
  }, [setAuthStateSafe]);

  const refreshProfile = useCallback(async (): Promise<boolean> => {
    try {
      if (!authState.user?.id) return false;
      
      const profile = await fetchProfileWithGuard(authState.user.id, true);
      
      if (profile) {
        setAuthStateSafe((prev) => ({
          ...prev,
          profile,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh profile:', error);
      return false;
    }
  }, [authState.user?.id, setAuthStateSafe, fetchProfileWithGuard]);

  const value = useMemo<UseAuthReturn>(() => ({
    ...authState,
    login,
    logout,
    clearError,
    refreshProfile,
    isAuthenticated: !!authState.user,
    isAdmin: authState.profile?.role === 'admin',
    isEmployee: authState.profile?.role === 'employee',
  }), [authState, login, logout, clearError, refreshProfile]);

  return React.createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};