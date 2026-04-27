'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/supabase/auth';
import { RestaurantForm, type RestaurantInput } from '@/components/admin/RestaurantForm';
import styles from './page.module.css';

export default function NewRestaurantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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

  const handleSubmit = async (data: RestaurantInput) => {
    const res = await fetch('/api/admin/restaurants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar restaurante');
    }

    router.push('/admin/restaurants');
  };

  const handleCancel = () => {
    router.push('/admin/restaurants');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Novo Restaurante</h1>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/admin">Admin</Link>
          <span>/</span>
          <Link href="/admin/restaurants">Restaurantes</Link>
          <span>/</span>
          <span>Novo</span>
        </nav>
      </header>

      <RestaurantForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </div>
  );
}
