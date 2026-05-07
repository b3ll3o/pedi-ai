'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { useAuth } from '@/hooks/useAuth';
import { RegisterForm } from '@/components/auth/RegisterForm';
import styles from './page.module.css';

// Timeout para detectar sessão lenta/falhou e exibir o formulário mesmo assim
const SESSION_CHECK_TIMEOUT_MS = 5000;

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const { signUp, isAuthenticated } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setSessionChecked(true);
      }
    }, SESSION_CHECK_TIMEOUT_MS);

    getSession()
      .then((session) => {
        if (cancelled) return;
        if (session?.user) {
          router.replace('/menu');
          return;
        }
        setSessionChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSessionChecked(true);
      });

    return () => {
      cancelled = true;
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

  if (!sessionChecked) {
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
