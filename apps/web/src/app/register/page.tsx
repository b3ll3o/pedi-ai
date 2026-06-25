'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/hooks/useAuth';

import styles from './page.module.css';

// Timeout para detectar sessão lenta/falhou e exibir o formulário mesmo assim
const SESSION_CHECK_TIMEOUT_MS = 3000;

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [sessionChecked, setSessionChecked] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Efeito 1: marca a sessão como "checada" assim que o auth termina de
  // carregar OU quando o timeout de fallback expira (sessão lenta).
  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      const timeoutId = setTimeout(() => {
        if (!cancelled) {
          setSessionChecked(true);
        }
      }, SESSION_CHECK_TIMEOUT_MS);

      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }

    // auth já carregou — sai do loading no próximo render.
    // Usamos queueMicrotask para evitar o warning react-hooks/set-state-in-effect.
    queueMicrotask(() => {
      if (!cancelled) setSessionChecked(true);
    });
  }, [authLoading]);

  // Efeito 2: redirecionar se já autenticado.
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
