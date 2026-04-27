'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { useRestaurantStore } from '@/stores/restaurantStore';
import styles from './page.module.css';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const { restauranteSelecionado } = useRestaurantStore();

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

  // Redirect to restaurants page if no restaurant selected
  useEffect(() => {
    if (!loading && !restauranteSelecionado) {
      router.replace('/admin/restaurants');
    }
  }, [loading, restauranteSelecionado, router]);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Dashboard</h1>
          {restauranteSelecionado && (
            <span className={styles.restaurantIndicator}>
              {restauranteSelecionado.nome}
            </span>
          )}
        </div>
      </header>
      {loading && <div className={styles.loading}>Carregando...</div>}
      {!loading && restauranteSelecionado && (
        <nav className={styles.nav}>
          <Link href="/admin/orders" className={styles.link}>Pedidos</Link>
          <Link href="/admin/products" className={styles.link}>Produtos</Link>
          <Link href="/admin/categories" className={styles.link}>Categorias</Link>
          <Link href="/admin/tables" className={styles.link}>Mesas</Link>
          <Link href="/admin/restaurants" className={styles.link}>Restaurantes</Link>
        </nav>
      )}
    </div>
  );
}
