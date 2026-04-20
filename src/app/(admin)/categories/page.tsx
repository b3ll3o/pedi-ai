'use client';

import { useState, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { CategoryList } from '@/components/admin/CategoryList';
import type { categories } from '@/lib/supabase/types';
import styles from './page.module.css';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<categories[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleReorder = useCallback(
    async (updates: { id: string; sort_order: number }[]) => {
      // TODO: Implement reorder API call
      console.log('Reorder categories:', updates);
    },
    []
  );

  const handleEdit = useCallback((category: categories) => {
    // TODO: Open edit modal or navigate to edit page
    console.log('Edit category:', category);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    // TODO: Implement delete with confirmation
    console.log('Delete category:', id);
  }, []);

  const handleCreate = useCallback(() => {
    // TODO: Open create modal or navigate to create page
    console.log('Create new category');
  }, []);

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Categorias</h1>
            <p className={styles.subtitle}>
              Gerencie as categorias do cardápio
            </p>
          </div>

          <button
            type="button"
            className={styles.createButton}
            onClick={handleCreate}
          >
            + Nova Categoria
          </button>
        </header>

        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} aria-label="Carregando..." />
          </div>
        ) : (
          <CategoryList
            categories={categories}
            onReorder={handleReorder}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>
    </AdminLayout>
  );
}
