/**
 * Página 404 - Not Found
 * Redireciona usuários autenticados para o dashboard,
 * exibe página 404 pública para usuários não autenticados.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import styles from './not-found.module.css';

export default function NotFound() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <main className={styles.container}>
        <div className={styles.content} role="status" aria-label="Carregando">
          <div className={styles.skeleton}>
            <div className={`${styles.skeletonTitle}`} />
            <div className={`${styles.skeletonSubtitle}`} />
            <div className={`${styles.skeletonIcon}`} />
            <div className={styles.skeletonActions}>
              <div className={styles.skeletonButton} />
              <div className={styles.skeletonButton} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <main className={styles.container}>
      <section aria-labelledby="error-title" className={styles.content}>
        <div className={styles.icon} aria-hidden="true">
          <span className={styles.errorCode}>404</span>
        </div>

        <h1 id="error-title" className={styles.title}>
          Ops! Página não encontrada
        </h1>

        <p className={styles.subtitle}>A página que você procura não existe ou foi movida.</p>

        <div className={styles.actions}>
          <Link href="/" className={styles.primaryButton} aria-label="Voltar ao cardápio principal">
            Voltar ao Cardápio
          </Link>

          <Link
            href="/login"
            className={styles.secondaryButton}
            aria-label="Fazer login na sua conta"
          >
            Fazer Login
          </Link>
        </div>
      </section>
    </main>
  );
}
