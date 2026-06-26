/**
 * useAuth Hook
 *
 * Hook para gerenciamento de estado de autenticação.
 * Os tokens vivem em **cookies HttpOnly** definidos pelo servidor;
 * este hook só mantém o perfil do usuário (não-confidencial) em estado React.
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
 *
 * A autenticação é derivada de uma única chamada a `/auth/me` no mount:
 * se o servidor responder 200 com um usuário, há cookie HttpOnly válido;
 * se responder 401, o cookie expirou ou não existe.
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verifica a sessão no mount via /auth/me (cookie HttpOnly viaja no request).
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const currentUser = await apiClient.verifySession();
        if (isMounted) {
          if (currentUser) {
            setUser(currentUser as AuthUser);
            setSession({ user: currentUser as AuthUser });
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await apiClient.logout();
      setSession(null);
      setUser(null);
      router.push('/login');
    } catch (err) {
      setSession(null);
      setUser(null);
      setError(err instanceof Error ? err.message : 'Falha ao sair');
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    user,
    session,
    isLoading,
    isAuthenticated: user !== null,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };
}
