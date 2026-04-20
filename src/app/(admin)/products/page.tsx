'use client';

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ProductList } from '@/components/admin/ProductList';
import type { products } from '@/lib/supabase/types';
import styles from './page.module.css';

export default function ProductsPage() {
  const [products, setProducts] = useState<products[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = useCallback((product: products) => {
    // TODO: Open edit modal or navigate to edit page
    console.log('Edit product:', product);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    // TODO: Implement delete with confirmation
    console.log('Delete product:', id);
  }, []);

  const handleToggleAvailability = useCallback((product: products) => {
    // TODO: Implement toggle availability API call
    console.log('Toggle availability:', product);
  }, []);

  const handleCreate = useCallback(() => {
    // TODO: Open create modal or navigate to create page
    console.log('Create new product');
  }, []);

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Produtos</h1>
            <p className={styles.subtitle}>
              Gerencie os produtos do cardápio
            </p>
          </div>

          <button
            type="button"
            className={styles.createButton}
            onClick={handleCreate}
          >
            + Novo Produto
          </button>
        </header>

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} aria-label="Carregando..." />
          </div>
        ) : (
          <ProductList
            products={products}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleAvailability={handleToggleAvailability}
          />
        )}
      </div>
    </AdminLayout>
  );
}