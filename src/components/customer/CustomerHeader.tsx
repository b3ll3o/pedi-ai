'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DoorOpen, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Logo from '@/app/components/Logo';
import styles from './CustomerHeader.module.css';

export function CustomerHeader() {
  const { isAuthenticated, signOut, isLoading: authLoading, user } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      await signOut();
      router.push('/login');
    } catch {
      setLogoutError('Erro ao sair. Tente novamente.');
      setIsLoggingOut(false);
    }
  };

  return (
    <header className={styles.header} data-testid="customer-header">
      <div className={styles.container}>
        <Logo size={20} />
        {isAuthenticated && !authLoading ? (
          <>
            <span className={styles.userInfo} data-testid="user-info">
              {user?.email ?? 'Usuário'}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="customer-logout-button"
              className={styles.logoutButton}
              aria-label="Sair da conta"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 size={18} className={styles.spinner} aria-hidden="true" />
                  <span className={styles.logoutText}>Saindo...</span>
                </>
              ) : (
                <>
                  <DoorOpen size={18} aria-hidden="true" />
                  <span className={styles.logoutText}>Sair</span>
                </>
              )}
            </button>
          </>
        ) : (
          <a
            href="/login"
            className={styles.logoutButton}
            aria-label="Entrar na conta"
          >
            <DoorOpen size={18} aria-hidden="true" />
            <span className={styles.logoutText}>Entrar</span>
          </a>
        )}
        {logoutError && (
          <span className={styles.errorMessage} role="alert">
            {logoutError}
          </span>
        )}
      </div>
    </header>
  );
}
