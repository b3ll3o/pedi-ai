/**
 * useAuth Hook
 * Hook para gerenciamento de estado de autenticação.
 * Usa AutenticarUsuarioUseCase e RegistrarUsuarioUseCase do application layer.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { signIn as _supabaseSignIn, signOut as supabaseSignOut, getSession, getUser, onAuthStateChange } from '@/lib/supabase/auth';
import { AutenticarUsuarioUseCase, type AutenticarInput } from '@/application/autenticacao/services/AutenticarUsuarioUseCase';
import { RegistrarUsuarioUseCase, type RegistrarUsuarioInput } from '@/application/autenticacao/services/RegistrarUsuarioUseCase';
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

    async function initAuth() {
      try {
        const [sessionResult, userResult] = await Promise.all([getSession(), getUser()]);
        if (isMounted) {
          setSession(sessionResult);
          setUser(userResult);
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
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || session === null) {
        // Session expired or user signed out - redirect to login
        setSession(null);
        setUser(null);
        router.push('/login');
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
      const [sessionResult, userResult] = await Promise.all([getSession(), getUser()]);
      setSession(sessionResult);
      setUser(userResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha na autenticação');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Registra novo usuário usando RegistrarUsuarioUseCase.
   */
  const handleSignUp = useCallback(async (email: string, password: string, papel: string = 'cliente') => {
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
  }, []);

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
    isAuthenticated: !!session && !!user,
    error,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
  };
}
