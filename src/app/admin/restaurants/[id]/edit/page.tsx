'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/supabase/auth';
import { RestaurantForm, type RestaurantInput } from '@/components/admin/RestaurantForm';
import type { restaurants } from '@/lib/supabase/types';
import styles from './page.module.css';

export default function EditRestaurantPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<restaurants | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }

        // Fetch restaurant data
        const res = await fetch(`/api/admin/restaurants/${restaurantId}`);
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          throw new Error('Erro ao carregar restaurante');
        }

        const data = await res.json();
        setRestaurant(data.restaurant);
        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [router, restaurantId]);

  const handleSubmit = async (data: RestaurantInput) => {
    const res = await fetch(`/api/admin/restaurants/${restaurantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao atualizar restaurante');
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

  if (notFound) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          <h2>Restaurante não encontrado</h2>
          <p>O restaurante que você está tentando editar não existe ou foi removido.</p>
          <Link href="/admin/restaurants" className={styles.backLink}>
            Voltar para Restaurantes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Editar Restaurante</h1>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/admin">Admin</Link>
          <span>/</span>
          <Link href="/admin/restaurants">Restaurantes</Link>
          <span>/</span>
          <span>{restaurant?.name || 'Editar'}</span>
        </nav>
      </header>

      {restaurant && (
        <RestaurantForm restaurant={restaurant} onSubmit={handleSubmit} onCancel={handleCancel} />
      )}
    </div>
  );
}
