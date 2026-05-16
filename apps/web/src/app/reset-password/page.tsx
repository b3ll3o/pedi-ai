'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import styles from './page.module.css';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <svg
              className={styles.errorIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h1 className={styles.errorTitle}>Link inválido</h1>
            <p className={styles.errorMessage}>
              O link de redefinição de senha está inválido ou expirou.
            </p>
            <p className={styles.redirectMessage}>Redirecionando para login...</p>
          </div>
        </div>
      </div>
    );
  }

  if (type && type !== 'recovery') {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <svg
              className={styles.errorIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <h1 className={styles.errorTitle}>Link inválido</h1>
            <p className={styles.errorMessage}>
              Este link não é um link de redefinição de senha válido.
            </p>
            <a href="/login" className={styles.backLink}>
              Voltar para login
            </a>
          </div>
        </div>
      </div>
    );
  }

  const handleSuccess = () => {
    router.push('/login?reset=success');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => router.push('/login')}
          aria-label="Voltar para login"
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
        <h1 className={styles.title}>Redefinir Senha</h1>
        <div className={styles.placeholder} aria-hidden="true" />
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.logoSection}>
            <h2 className={styles.logoTitle}>PediAI</h2>
            <p className={styles.subtitle}>Crie uma nova senha</p>
          </div>

          <ResetPasswordForm token={token} onSuccess={handleSuccess} />

          <div className={styles.footer}>
            <p>
              Lembrou a senha?{' '}
              <a href="/login" className={styles.link}>
                Fazer login
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function ResetPasswordFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} aria-label="Carregando..." />
      </div>
    </div>
  );
}

export default function CustomerResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
