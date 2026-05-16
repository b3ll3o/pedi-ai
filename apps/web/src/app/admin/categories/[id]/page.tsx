'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/supabase/auth';
import { CategoryForm, type CategoryInput } from '@/components/admin/CategoryForm';
import type { categories } from '@/lib/supabase/types';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CategoryEditPage({ params }: PageProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [category, setCategory] = useState<categories | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }
        setAuthChecked(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      }
    };
    checkAuth();
  }, [router]);

  // Unwrap params (Next.js 15+ async params)
  useEffect(() => {
    params.then((p) => setCategoryId(p.id));
  }, [params]);

  // Fetch category data via API
  useEffect(() => {
    if (!categoryId || !authChecked) return;

    const fetchCategory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/admin/categories/${categoryId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao carregar categoria');
        }
        const data = await res.json();
        setCategory(data.category);
      } catch (err) {
        console.error('Failed to fetch category:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar categoria');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId, authChecked]);

  const handleSubmit = useCallback(
    async (input: CategoryInput) => {
      if (!categoryId) return;

      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao atualizar categoria');
      }

      router.push('/admin/categories');
    },
    [categoryId, router]
  );

  const handleCancel = useCallback(() => {
    router.push('/admin/categories');
  }, [router]);

  if (!authChecked || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>{error ?? 'Categoria não encontrada'}</h2>
          <Link href="/admin/categories" className={styles.backLink}>
            Voltar para categorias
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/admin/categories" className={styles.backButton} aria-label="Voltar">
          ←
        </Link>
        <h1 className={styles.title}>Editar Categoria</h1>
      </header>

      <main className={styles.main}>
        <CategoryForm category={category} onSubmit={handleSubmit} onCancel={handleCancel} />
      </main>
    </div>
  );
}
