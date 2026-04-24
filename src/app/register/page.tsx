'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, signUp } from '@/lib/supabase/auth';
import { RegisterForm } from '@/components/auth/RegisterForm';
import styles from './page.module.css';

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

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

  const handleRegister = async (email: string, password: string) => {
    const { error } = await signUp(email, password);
    if (error) {
      throw new Error(error.message);
    }
    router.push('/login?registered=true');
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
          <RegisterForm onSubmit={handleRegister} />
          <div className={styles.footer}>
            <p>
              Já tem conta?{' '}
              <a href="/login" className={styles.link} data-testid="login-link">
                Entrar
              </a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}