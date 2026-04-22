'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, getSession } from '@/lib/supabase/auth';
import styles from './page.module.css';

export default function AdminDashboard() {
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

  const handleLogout = async () => {
    await signOut();
    router.push('/admin/login');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <button onClick={handleLogout} data-testid="logout-button" className={styles.logoutButton}>
          Sair
        </button>
      </header>
      {loading && <div className={styles.loading}>Carregando...</div>}
      {!loading && (
        <nav className={styles.nav}>
          <Link href="/admin/orders" className={styles.link}>Pedidos</Link>
          <Link href="/admin/products" className={styles.link}>Produtos</Link>
          <Link href="/admin/categories" className={styles.link}>Categorias</Link>
          <Link href="/admin/tables" className={styles.link}>Mesas</Link>
        </nav>
      )}
    </div>
  );
}