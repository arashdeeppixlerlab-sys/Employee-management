import { useState, useEffect, useRef } from 'react';
import { AuthService } from '../services/AuthService';
import { AuthState, LoginCredentials } from '../types/auth';

export const useAuth = () => {
  const isMounted = useRef(true);

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    isMounted.current = true;

    AuthService.initializeAuth();

    const initializeAuth = async () => {
      try {
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
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            error: null,
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
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

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
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Login failed',
        }));

        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Login failed';

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

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

        return { success: true };
      } else {
        setAuthState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Logout failed',
        }));

        return { success: false, error: response.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Logout failed';

      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      return { success: false, error: errorMessage };
    }
  };

  const clearError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  const refreshProfile = async (): Promise<boolean> => {
    try {
      if (!authState.user?.id) return false;
      
      const profile = await AuthService.fetchProfile(authState.user.id);
      
      if (isMounted.current && profile) {
        setAuthState(prev => ({
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
  };

  return {
    ...authState,
    login,
    logout,
    clearError,
    refreshProfile,
    isAuthenticated: !!authState.user,
    isAdmin: authState.profile?.role === 'admin',
    isEmployee: authState.profile?.role === 'employee',
  };
};