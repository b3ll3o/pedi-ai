/**
 * useAuth Hook
 * Hook para gerenciamento de estado de autenticação.
 * Usa lib/api-client.ts para operações de autenticação via API.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '@/lib/api-client';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  restaurantId?: string;
}

export interface AuthSession {
  user: AuthUser;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * React hook for managing authentication state.
 * Provides user session, loading states, and auth actions.
 * Usa lib/api-client.ts para operações de autenticação.
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state - restore tokens from sessionStorage and verify with API
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        // Try to restore tokens from sessionStorage
        const restored = apiClient.restoreTokens();

        if (restored) {
          // Verify token is still valid by fetching /auth/me
          const currentUser = await apiClient.getMe();
          if (isMounted) {
            if (currentUser) {
              setUser(currentUser as AuthUser);
              setSession({ user: currentUser as AuthUser });
            } else {
              // Token may have expired, clear it
              apiClient.clearTokens();
              setUser(null);
              setSession(null);
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setSession(null);
          }
        }
        setError(null);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Falha ao inicializar autenticação');
        }
      } finally {
        /* istanbul ignore if */ if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle sign in
  const handleSignIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.login(email, password);
      setUser(result.user as AuthUser);
      setSession({ user: result.user as AuthUser });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha na autenticação';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle sign up
  const handleSignUp = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.register(email, password, name);
      setUser(result.user as AuthUser);
      setSession({ user: result.user as AuthUser });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha no registro';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.logout();
      setSession(null);
      setUser(null);
      router.push('/login');
    } catch (err) {
      /* istanbul ignore next */ setError(err instanceof Error ? err.message : 'Falha ao sair');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: apiClient.isAuthenticated(),
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };
}
