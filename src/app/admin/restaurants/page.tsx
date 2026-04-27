'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/supabase/auth';
import { RestaurantCard } from '@/components/admin/RestaurantCard';
import type { restaurants } from '@/lib/supabase/types';
import styles from './page.module.css';

type ToastType = 'success' | 'error' | null;

interface RestaurantWithTeam extends restaurants {
  team_count?: number;
}

export default function RestaurantsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<RestaurantWithTeam[]>([]);
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({ type: null, message: '' });

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    if (type) {
      setTimeout(() => setToast({ type: null, message: '' }), 4000);
    }
  }, []);

  const fetchRestaurants = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/restaurants');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao buscar restaurantes');
      }
      const data = await res.json();
      setRestaurants(data.restaurants || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar restaurantes';
      showToast('error', message);
    }
  }, [showToast]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }
        setLoading(false);
        await fetchRestaurants();
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [router, fetchRestaurants]);

  const handleEdit = (restaurant: restaurants) => {
    router.push(`/admin/restaurants/${restaurant.id}/edit`);
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
        <h1 className={styles.title}>Meus Restaurantes</h1>
        <div className={styles.actions}>
          <Link href="/admin/restaurants/new" className={styles.addButton}>
            + Novo Restaurante
          </Link>
        </div>
      </header>

      {toast.type && (
        <div
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
        >
          {toast.message}
        </div>
      )}

      {restaurants.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🏪</span>
          <h2>Nenhum restaurante</h2>
          <p>Crie seu primeiro restaurante para começar</p>
          <Link href="/admin/restaurants/new" className={styles.addButton}>
            + Criar Restaurante
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {restaurants.map((restaurant) => (
            <RestaurantCard
              key={restaurant.id}
              restaurant={restaurant}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
