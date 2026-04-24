'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
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

  // Fetch category data
  useEffect(() => {
    if (!categoryId || !authChecked) return;

    const fetchCategory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoryId)
          .single();

        if (fetchError) {
          throw fetchError;
        }

        if (!data) {
          setError('Categoria não encontrada');
          return;
        }

        setCategory(data as categories);
      } catch (err) {
        console.error('Failed to fetch category:', err);
        setError('Erro ao carregar categoria');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategory();
  }, [categoryId, authChecked]);

  const handleSubmit = useCallback(
    async (input: CategoryInput) => {
      if (!categoryId) return;

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('categories')
        .update({
          name: input.name,
          description: input.description ?? null,
          image_url: input.image_url ?? null,
        })
        .eq('id', categoryId);

      if (updateError) {
        throw updateError;
      }

      router.push('/admin/categorias');
    },
    [categoryId, router]
  );

  const handleCancel = useCallback(() => {
    router.push('/admin/categorias');
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
          <Link href="/admin/categorias" className={styles.backLink}>
            Voltar para categorias
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/admin/categorias" className={styles.backButton} aria-label="Voltar">
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