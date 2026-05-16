'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/supabase/auth';
import { RestaurantForm, type RestaurantFormData } from '@/components/admin/RestaurantForm';
import styles from './page.module.css';

export default function NewRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  const handleSubmit = async (data: RestaurantFormData) => {
    setSubmitError(null);

    const res = await fetch('/api/admin/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.nome,
        address: data.endereco,
        phone: data.telefone,
        logo_url: data.logoUrl,
      }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar restaurante');
    }

    const { restaurant } = await res.json();
    router.push(`/admin/restaurants/${restaurant.id}/edit`);
  };

  const handleCancel = () => {
    router.push('/admin/restaurants');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading} role="status" aria-live="polite">
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Novo Restaurante</h1>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/admin">Admin</Link>
          <span aria-hidden="true">/</span>
          <Link href="/admin/restaurants">Restaurantes</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Novo</span>
        </nav>
      </header>

      <main>
        <RestaurantForm mode="create" onSubmit={handleSubmit} onCancel={handleCancel} />
        {submitError && (
          <p className={styles.error} role="alert">
            {submitError}
          </p>
        )}
      </main>

      <footer className={styles.footer}>
        <Link href="/admin/restaurants" className={styles.backLink}>
          ← Voltar para listagem
        </Link>
      </footer>
    </div>
  );
}
