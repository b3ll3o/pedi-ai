import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { signIn, signOut, getSession, getUser, onAuthStateChange } from '@/lib/supabase/auth';

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * React hook for managing authentication state.
 * Provides user session, loading states, and auth actions.
 *
 * @example
 * ```tsx
 * const { user, isLoading, isAuthenticated, signIn, signOut, error } = useAuth();
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
          setError(err instanceof Error ? err.message : 'Failed to initialize auth');
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
        router.push('/(admin)/(auth)/login');
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

  const handleSignIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await signIn(email, password);
      if (authError) {
        setError(authError.message);
        return;
      }
      if (data) {
        setSession(data.session);
        setUser(data.user);
      }
    } catch (err) {
      /* istanbul ignore next */ setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signOut();
      setSession(null);
      setUser(null);
    } catch (err) {
      /* istanbul ignore next */ setError(err instanceof Error ? err.message : 'Sign out failed');
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
    signOut: handleSignOut,
  };
}
