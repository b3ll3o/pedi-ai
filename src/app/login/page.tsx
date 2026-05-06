'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useRedirectByRole } from '@/hooks/useRedirectByRole';
import { LoginForm } from '@/components/auth/LoginForm';
import styles from './page.module.css';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, isAuthenticated, session } = useAuth();
  const { destination, isLoading, hasDeterminedDestination } = useRedirectByRole(session?.user?.id ?? null, isAuthenticated);
  const registeredSuccess = searchParams.get('registered') === 'true';
  const resetSuccess = searchParams.get('reset') === 'success';

  // Computa se deve mostrar loading: enquanto estiver verificando sessão E carregando profile
  // Quando isLoading ou hasDeterminedDestination muda, showLoading é recalculado
  const showLoading = isLoading || (isAuthenticated && !hasDeterminedDestination);

  useEffect(() => {
    // Redireciona usuário autenticado quando destino estiver determinado
    if (isAuthenticated && hasDeterminedDestination) {
      router.replace(destination);
    }
  }, [router, destination, isAuthenticated, hasDeterminedDestination]);

  const handleLogin = async (email: string, password: string) => {
    await signIn(email, password);
  };

  if (showLoading) {
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
          <LoginForm onSubmit={handleLogin} registeredSuccess={registeredSuccess} resetSuccess={resetSuccess} />
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

function LoginFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} aria-label="Carregando..." />
      </div>
    </div>
  );
}

export default function CustomerLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}
