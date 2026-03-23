import { useState, useEffect, useRef } from 'react';
import { AuthService } from '../services/AuthService';
import { AuthState, LoginCredentials } from '../types/auth';
import { useRouter } from 'expo-router';

export const useAuth = () => {
  const isMounted = useRef(true);
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    isMounted.current = true;

    // Initialize auth service
    AuthService.initializeAuth();

    const initializeAuth = async () => {
      try {
        if (isMounted.current) {
          setAuthState(prev => ({ ...prev, loading: true, error: null }));
        }

        const { user, profile } = await AuthService.getCurrentUser();

        if (isMounted.current) {
          setAuthState({
            user,
            profile,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (isMounted.current) {
          // Don't show session errors to user - just clear state
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null, // Clear error for session issues
          });
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted.current = false;
      AuthService.cleanup();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      if (isMounted.current) {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
      }

      const response = await AuthService.login(credentials);

      if (response.success && response.profile) {
        const { user } = await AuthService.getCurrentUser();

        if (isMounted.current) {
          setAuthState({
            user,
            profile: response.profile,
            loading: false,
            error: null,
          });
        }

        return { success: true, profile: response.profile };
      } else {
        if (isMounted.current) {
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: response.error || 'Login failed',
          }));
        }

        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';

      if (isMounted.current) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }

      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      if (isMounted.current) {
        setAuthState(prev => ({ ...prev, loading: true, error: null }));
      }

      const response = await AuthService.logout();

      if (response.success) {
        if (isMounted.current) {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null,
          });
        }

        // Navigate to login immediately
        router.replace('/');
        return { success: true };
      } else {
        if (isMounted.current) {
          setAuthState(prev => ({
            ...prev,
            loading: false,
            error: response.error || 'Logout failed',
          }));
        }

        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';

      if (isMounted.current) {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }

      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    if (isMounted.current) {
      setAuthState(prev => ({ ...prev, error: null }));
    }
  };

  return {
    ...authState,
    login,
    logout,
    clearError,
    isAuthenticated: !!authState.user,
    isAdmin: authState.profile?.role === 'admin',
    isEmployee: authState.profile?.role === 'employee',
  };
};