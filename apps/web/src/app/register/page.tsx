'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';

import styles from './page.module.css';

// Timeout para detectar sessão lenta/falhou e exibir o formulário mesmo assim
const SESSION_CHECK_TIMEOUT_MS = 3000;

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    // Se auth já carregou e usuário está logado, redirecionar
    if (!authLoading) {
      if (apiClient.isAuthenticated()) {
        router.replace('/menu');
        return;
      }
      setSessionChecked(true);
      return;
    }

    // Timeout fallback - se a verificação de sessão demorar muito, mostra o formulário
    timeoutId = setTimeout(() => {
      if (!cancelled) {
        setSessionChecked(true);
      }
    }, SESSION_CHECK_TIMEOUT_MS);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [authLoading, router]);

  // Redirecionar após autenticação (se logar após ver o formulário)
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/menu');
    }
  }, [isAuthenticated, router]);

  const handleRegister = async (
    name: string,
    email: string,
    password: string,
    intent: 'gerenciar_restaurante' | 'fazer_pedidos'
  ) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nome: name, senha: password, intent }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro ao criar perfil' }));
      throw new Error(errorData.error || 'Erro ao criar perfil');
    }
    router.push(`/login?registered=true&intent=${intent}`);
  };

  if (!sessionChecked || authLoading) {
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
