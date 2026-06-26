'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import type { CategoryDTO, ProductDTO } from '@pedi-ai/shared/types';

import { ProductForm, type ProductInput } from '@/components/admin/ProductForm';
import { getSession } from '@/lib/auth/client';

import styles from './page.module.css';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductEditPage({ params }: PageProps) {
  const router = useRouter();
  const [productId, setProductId] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDTO | null>(null);
  const [categoriesList, setCategoriesList] = useState<CategoryDTO[]>([]);
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
    params.then((p) => setProductId(p.id));
  }, [params]);

  // Fetch product and categories data
  useEffect(() => {
    if (!productId || !authChecked) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch product via API
        const productRes = await fetch(`/api/admin/products/${productId}`);
        if (!productRes.ok) {
          if (productRes.status === 404) {
            setError('Produto não encontrado');
            return;
          }
          throw new Error('Erro ao carregar produto');
        }
        const productData = await productRes.json();
        setProduct(productData.product);

        // Fetch categories via API
        const categoriesRes = await fetch('/api/admin/categories');
        if (categoriesRes.ok) {
          const categoriesData = await categoriesRes.json();
          setCategoriesList(categoriesData.categories || []);
        }
      } catch (err) {
        console.error('Failed to fetch product:', err);
        setError('Erro ao carregar produto');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [productId, authChecked]);

  const handleSubmit = useCallback(
    async (input: ProductInput) => {
      if (!productId) return;

      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: input.name,
          description: input.description ?? null,
          price: input.price,
          category_id: input.category_id,
          image_url: input.image_url ?? null,
          dietary_labels: input.dietary_labels ?? null,
          available: input.available ?? true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao atualizar produto');
      }

      router.push('/admin/produtos');
    },
    [productId, router]
  );

  const handleCancel = useCallback(() => {
    router.push('/admin/produtos');
  }, [router]);

  if (!authChecked || isLoading) {
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
