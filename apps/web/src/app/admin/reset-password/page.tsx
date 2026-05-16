'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import styles from './page.module.css';

function AdminResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const type = searchParams.get('type');

  if (!token) {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
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
        </main>
      </div>
    );
  }

  if (type && type !== 'recovery') {
    return (
      <div className={styles.container}>
        <main className={styles.main}>
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
              <a href="/admin/login" className={styles.backLink}>
                Voltar para login
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleSuccess = () => {
    router.push('/admin/login?reset=success');
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.logoSection}>
            <div className={styles.logoIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5Z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h1 className={styles.title}>PediAI</h1>
            <p className={styles.subtitle}>Criar nova senha</p>
          </div>

          <ResetPasswordForm token={token} onSuccess={handleSuccess} isAdmin />

          <div className={styles.footer}>
            <p>
              Lembrou a senha?{' '}
              <a href="/admin/login" className={styles.link}>
                Fazer login
              </a>
            </p>
          </div>
        </div>

        <footer className={styles.pageFooter}>
          <p>&copy; 2024 PediAI. Todos os direitos reservados.</p>
        </footer>
      </main>
    </div>
  );
}

function AdminResetPasswordFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} aria-label="Carregando..." />
      </div>
    </div>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense fallback={<AdminResetPasswordFallback />}>
      <AdminResetPasswordContent />
    </Suspense>
  );
}
