'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { useRestaurantStore } from '@/infrastructure/persistence/restaurantStore';
import { CategoryList } from '@/components/admin/CategoryList';
import { CategoryForm, type CategoryInput } from '@/components/admin/CategoryForm';
import type { categories } from '@/lib/supabase/types';
import styles from './page.module.css';

type ToastType = 'success' | 'error' | null;

export default function CategoriesPage() {
  const router = useRouter();
  const { restauranteSelecionado } = useRestaurantStore();
  const selectedRestaurantId = restauranteSelecionado?.id ?? null;
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<categories[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<categories | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Loading states for operations
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ type: ToastType; message: string }>({
    type: null,
    message: '',
  });

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    if (type) {
      setTimeout(() => setToast({ type: null, message: '' }), 4000);
    }
  }, []);

  // Fetch categories from API
  const fetchCategories = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      const res = await fetch(`/api/admin/categories?restaurant_id=${selectedRestaurantId}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao buscar categorias');
      }
      const data = await res.json();
      setCategories(data.categories || []);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar categorias';
      setError(message);
      showToast('error', message);
    }
  }, [selectedRestaurantId, showToast]);

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

  // Load data when restaurant is selected
  useEffect(() => {
    if (!loading && selectedRestaurantId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCategories();
    }
  }, [loading, selectedRestaurantId, fetchCategories]);

  // Handle create new category
  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  // Handle edit category
  const handleEdit = (category: categories) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  };

  // Handle form submit (create or update)
  const handleSubmit = async (input: CategoryInput) => {
    try {
      if (editingCategory) {
        // Update existing
        const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao atualizar categoria');
        }
        showToast('success', 'Categoria atualizada com sucesso');
      } else {
        // Create new
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...input, restaurant_id: selectedRestaurantId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao criar categoria');
        }
        showToast('success', 'Categoria criada com sucesso');
      }
      setIsModalOpen(false);
      setEditingCategory(null);
      await fetchCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar categoria';
      showToast('error', message);
      throw err;
    }
  };

  // Handle delete click
  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${deletingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir categoria');
      }
      showToast('success', 'Categoria excluída com sucesso');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      await fetchCategories();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir categoria';
      showToast('error', message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle reorder
  const handleReorder = async (updates: { id: string; sort_order: number }[]) => {
    try {
      const res = await fetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories: updates }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao reordenar categorias');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao reordenar categorias';
      showToast('error', message);
      throw err;
    }
  };

  // Handle cancel modal
  const handleCancelModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  if (!restauranteSelecionado) {
    return (
      <div className={styles.container}>
        <div className={styles.noRestaurantPrompt}>
          <div className={styles.noRestaurantIcon}>🍽️</div>
          <h2 className={styles.noRestaurantTitle}>Nenhum restaurante selecionado</h2>
          <p className={styles.noRestaurantText}>
            Selecione um restaurante para gerenciar suas categorias.
          </p>
          <button
            className={styles.selectRestaurantButton}
            onClick={() => router.push('/admin/restaurants')}
          >
            Selecionar restaurante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 data-testid="page-title" className={styles.title}>
            Categorias
          </h1>
          <span className={styles.restaurantIndicator}>📍 {restauranteSelecionado.nome}</span>
        </div>
        <div className={styles.actions}>
          <button
            data-testid="add-category-button"
            className={styles.addButton}
            onClick={handleAddCategory}
          >
            Nova Categoria
          </button>
        </div>
      </header>

      {/* Toast notification */}
      {toast.type && (
        <div
          data-testid={toast.type === 'success' ? 'success-message' : 'error-message'}
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
          aria-live="polite"
        >
          {toast.message}
        </div>
      )}

      {/* Error state */}
      {error && !categories.length && (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button onClick={fetchCategories} className={styles.retryButton}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Category list */}
      {!error && (
        <CategoryList
          categories={categories}
          onReorder={handleReorder}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Modal de adição/edição de categoria */}
      {isModalOpen && (
        <div data-testid="category-form-modal" className={styles.modal}>
          <div className={styles.modalContent}>
            <CategoryForm
              category={editingCategory || undefined}
              onSubmit={handleSubmit}
              onCancel={handleCancelModal}
            />
          </div>
        </div>
      )}

      {/* Modal de confirmação de delete */}
      <div data-testid="confirm-delete-modal" className={styles.modal} hidden={!isDeleteModalOpen}>
        <div className={styles.modalContent}>
          <h3 className={styles.deleteTitle}>Confirmar exclusão</h3>
          <p className={styles.deleteText}>
            Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.
          </p>
          <div className={styles.deleteActions}>
            <button
              data-testid="cancel-delete-button"
              className={styles.cancelButton}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingId(null);
              }}
              disabled={isDeleting}
            >
              Cancelar
            </button>
            <button
              data-testid="confirm-delete-button"
              className={styles.confirmDeleteButton}
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
