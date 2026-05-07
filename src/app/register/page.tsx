'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { useAuth } from '@/hooks/useAuth';
import { RegisterForm } from '@/components/auth/RegisterForm';
import styles from './page.module.css';

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const { signUp, isAuthenticated } = useAuth();

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const checkSession = async () => {
      try {
        // Timeout de 5 segundos para evitar carregamento infinito
        const timeoutPromise = new Promise<null>((resolve) => {
          timeoutId = setTimeout(() => resolve(null), 5000);
        });

        const sessionPromise = getSession();
        const results = await Promise.race([sessionPromise, timeoutPromise]);

        // Se Promise.race retornou null, foi timeout
        if (results === null) {
          console.warn('Session check timed out, continuing anyway');
          if (isMounted) setIsCheckingSession(false);
          return;
        }

        const session = results;
        if (isMounted && session?.user) {
          router.replace('/menu');
          return;
        }
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        if (isMounted) {
          clearTimeout(timeoutId);
          setIsCheckingSession(false);
        }
      }
    };

    checkSession();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [router]);

  // Redirecionar após autenticação bem-sucedida
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/menu');
    }
  }, [isAuthenticated, router]);

  const handleRegister = async (email: string, password: string, intent: 'gerenciar_restaurante' | 'fazer_pedidos') => {
    await signUp(email, password);
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, intent })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro ao criar perfil' }));
      throw new Error(errorData.error || 'Erro ao criar perfil');
    }
    router.push(`/login?registered=true&intent=${intent}`);
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
