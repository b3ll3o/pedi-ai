'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { useAuth } from '@/hooks/useAuth';
import { useRedirectByRole } from '@/hooks/useRedirectByRole';
import { LoginForm } from '@/components/auth/LoginForm';
import styles from './page.module.css';

export default function CustomerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { signIn, isAuthenticated, session } = useAuth();
  const { destination } = useRedirectByRole(session?.user?.id ?? null);
  const registeredSuccess = searchParams.get('registered') === 'true';

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          router.replace(destination);
          return;
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [router, destination]);

  // Redirecionar após autenticação bem-sucedida
  useEffect(() => {
    if (isAuthenticated) {
      router.push(destination);
    }
  }, [isAuthenticated, router, destination]);

  const handleLogin = async (email: string, password: string) => {
    await signIn(email, password);
  };

  if (isCheckingSession) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} aria-label="Carregando..." />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/')}
          aria-label="Voltar para home"
          type="button"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className={styles.title}>Entrar</h1>
        <div className={styles.placeholder} aria-hidden="true" />
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.logoSection}>
            <h2 className={styles.logoTitle}>PediAI</h2>
            <p className={styles.subtitle}>Cardápio Digital</p>
          </div>
          <LoginForm onSubmit={handleLogin} registeredSuccess={registeredSuccess} />
          <div className={styles.footer}>
            <p>
              Não tem conta?{' '}
              <a href="/register" className={styles.link}>
                Criar conta
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
