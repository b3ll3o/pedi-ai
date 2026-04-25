'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from '@/components/auth/LoginForm';
import styles from './page.module.css';

export default function CustomerLoginPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { signIn, isAuthenticated } = useAuth();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          router.replace('/menu');
          return;
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [router]);

  // Redirecionar após autenticação bem-sucedida
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/menu');
    }
  }, [isAuthenticated, router]);

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
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.logoSection}>
            <h1 className={styles.title}>PediAI</h1>
            <p className={styles.subtitle}>Cardápio Digital</p>
          </div>
          <LoginForm onSubmit={handleLogin} />
        </div>
      </main>
    </div>
  );
}
