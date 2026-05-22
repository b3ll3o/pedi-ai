/**
 * useAuth Hook
 * Hook para gerenciamento de estado de autenticação.
 * Usa lib/auth/client.ts para operações de autenticação.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, logout, getSession } from '@/lib/auth/client';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  restaurantId?: string;
}

export interface AuthSession {
  user: AuthUser;
  token: string;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, papel?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * React hook for managing authentication state.
 * Provides user session, loading states, and auth actions.
 * Usa lib/auth/client.ts para operações de autenticação.
 *
 * @example
 * ```tsx
 * const { user, isLoading, isAuthenticated, signIn, signUp, signOut, error } = useAuth();
 * ```
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const sessionData = await getSession();
        if (isMounted) {
          if (sessionData) {
            setUser(sessionData.user);
            setSession({ user: sessionData.user, token: '' });
          } else {
            setUser(null);
            setSession(null);
          }
          setError(null);
        }
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
      const result = await login(email, password);
      if (result.error) {
        throw new Error(result.error);
      }
      const sessionData = await getSession();
      if (sessionData) {
        setUser(sessionData.user);
        setSession({ user: sessionData.user, token: '' });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha na autenticação';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle sign up (placeholder - not implemented in lib/auth/client.ts)
  const handleSignUp = useCallback(
    async (email: string, password: string, _papel: string = 'cliente') => {
      setIsLoading(true);
      setError(null);
      try {
        // Registration is not yet implemented in lib/auth/client.ts
        throw new Error('Registro não implementado');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha no registro');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await logout();
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
    isAuthenticated: !!session,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };
}
