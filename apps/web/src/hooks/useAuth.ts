/**
 * useAuth Hook
 * Hook para gerenciamento de estado de autenticação.
 * Usa AutenticarUsuarioUseCase e RegistrarUsuarioUseCase do application layer.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import {
  signIn as _supabaseSignIn,
  signOut as supabaseSignOut,
  getSession,
  getUser,
  onAuthStateChange,
} from '@/lib/supabase/auth';
import {
  AutenticarUsuarioUseCase,
  type AutenticarInput,
} from '@/application/autenticacao/services/AutenticarUsuarioUseCase';
import {
  RegistrarUsuarioUseCase,
  type RegistrarUsuarioInput,
} from '@/application/autenticacao/services/RegistrarUsuarioUseCase';
import { SupabaseAuthAdapter } from '@/infrastructure/external/SupabaseAuthAdapter';
import { UsuarioRepository } from '@/infrastructure/persistence/autenticacao/UsuarioRepository';
import { SessaoRepository } from '@/infrastructure/persistence/autenticacao/SessaoRepository';
import { db } from '@/infrastructure/persistence/database';

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
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
 * Usa use cases do application layer para operações de autenticação.
 *
 * @example
 * ```tsx
 * const { user, isLoading, isAuthenticated, signIn, signUp, signOut, error } = useAuth();
 * ```
 */
export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    let isMounted = true;
    const AUTH_INIT_TIMEOUT_MS = 10000;

    async function initAuth() {
      const TIMEOUT_ERROR = new Error('Auth init timeout');

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(TIMEOUT_ERROR), AUTH_INIT_TIMEOUT_MS)
        );

        const authPromise = Promise.all([getSession(), getUser()]);
        const [sessionResult, userResult] = await Promise.race([authPromise, timeoutPromise]).catch(
          async (err) => {
            // Apenas timeout trata como sem sessão; erros reais são relançados
            if (err === TIMEOUT_ERROR) {
              console.warn('Auth init timed out, retrying session check...');
              // Retry once more before giving up - session might just be slow
              const retrySession = await getSession().catch(() => null);
              return [retrySession, null];
            }
            throw err; // Re-lança erros reais para o catch externo
          }
        );

        if (isMounted) {
          setSession(sessionResult);
          setUser(userResult as User | null);
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

  // Listen to auth state changes and handle session expiry
  useEffect(() => {
    // Páginas públicas que não devem ter redirect automático
    const publicPaths = ['/login', '/register', '/reset-password'];
    const isPublicPath = publicPaths.includes(window.location.pathname);

    const {
      data: { subscription },
    } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || session === null) {
        // Session expired or user signed out - redirect to login
        // ONLY redirect if not on a public path (login/register)
        if (!isPublicPath) {
          setSession(null);
          setUser(null);
          router.push('/login');
        } else {
          // On public paths, just update state without redirect
          setSession(null);
          setUser(null);
        }
      } else if (event === 'TOKEN_REFRESHED' && session) {
        // Token refreshed - update session
        setSession(session);
      } /* istanbul ignore next */ else if (event === 'SIGNED_IN' && session) {
        // User signed in - update state
        setSession(session);
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  /**
   * Autentica usuário usando AutenticarUsuarioUseCase.
   */
  const handleSignIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Instanciar adapters e repositories
      const authAdapter = new SupabaseAuthAdapter();
      const sessaoRepo = new SessaoRepository(db);

      // Executar use case
      const autenticarUseCase = new AutenticarUsuarioUseCase(authAdapter, sessaoRepo);
      const input: AutenticarInput = {
        email,
        senha: password,
        dispositivo: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      };

      await autenticarUseCase.execute(input);

      // Atualizar estado após autenticação bem-sucedida
      // Retry getSession/getUser até 3 vezes com 100ms de delay
      // para evitar race condition onde session ainda não está disponível
      let sessionResult = null;
      let userResult = null;
      for (let i = 0; i < 3; i++) {
        [sessionResult, userResult] = await Promise.all([getSession(), getUser()]);
        if (sessionResult?.user) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      setSession(sessionResult);
      setUser(userResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Falha na autenticação';
      setError(errorMessage);
      // Lança erro para que o LoginForm possa exibir a mensagem
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Registra novo usuário usando RegistrarUsuarioUseCase.
   */
  const handleSignUp = useCallback(
    async (email: string, password: string, papel: string = 'cliente') => {
      setIsLoading(true);
      setError(null);
      try {
        // Instanciar adapters e repositories
        const authAdapter = new SupabaseAuthAdapter();
        const usuarioRepo = new UsuarioRepository(db);

        // Executar use case
        const registrarUseCase = new RegistrarUsuarioUseCase(usuarioRepo, authAdapter);
        const input: RegistrarUsuarioInput = {
          email,
          senha: password,
          papel: papel as RegistrarUsuarioInput['papel'],
        };

        await registrarUseCase.execute(input);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha no registro');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Realiza logout usando Supabase diretamente (limpa sessão local).
   */
  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await supabaseSignOut();
      setSession(null);
      setUser(null);
    } catch (err) {
      /* istanbul ignore next */ setError(err instanceof Error ? err.message : 'Falha ao sair');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    session,
    isLoading,
    // Session is the ground truth for authentication state
    // User can be null even with valid session during initial load
    isAuthenticated: !!session,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };
}
