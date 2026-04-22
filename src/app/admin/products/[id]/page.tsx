'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ProductForm, type ProductInput } from '@/components/admin/ProductForm';
import type { products, categories } from '@/lib/supabase/types';
import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductEditPage({ params }: PageProps) {
  const router = useRouter();
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<products | null>(null);
  const [categoriesList, setCategoriesList] = useState<categories[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Unwrap params (Next.js 15+ async params)
  useEffect(() => {
    params.then((p) => setProductId(p.id));
  }, [params]);

  // Fetch product and categories data
  useEffect(() => {
    if (!productId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Fetch product
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (productError) {
          throw productError;
        }

        if (!productData) {
          setError('Produto não encontrado');
          return;
        }

        setProduct(productData as products);

        // Fetch categories for the form dropdown
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (categoriesError) {
          throw categoriesError;
        }

        setCategoriesList(categoriesData as categories[]);
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError('Erro ao carregar produto');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  const handleSubmit = useCallback(
    async (input: ProductInput) => {
      if (!productId) return;

      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: input.name,
          description: input.description ?? null,
          price: input.price,
          category_id: input.category_id,
          image_url: input.image_url ?? null,
          dietary_labels: input.dietary_labels ?? null,
          available: input.available ?? true,
        })
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }

      router.push('/admin/produtos');
    },
    [productId, router]
  );

  const handleCancel = useCallback(() => {
    router.push('/admin/produtos');
  }, [router]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>{error ?? 'Produto não encontrado'}</h2>
          <Link href="/admin/produtos" className={styles.backLink}>
            Voltar para produtos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/admin/produtos" className={styles.backButton} aria-label="Voltar">
          ←
        </Link>
        <h1 className={styles.title}>Editar Produto</h1>
      </header>

      <main className={styles.main}>
        <ProductForm
          product={product}
          categories={categoriesList}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </main>
    </div>
  );
}