'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { useRestaurantStore } from '@/infrastructure/persistence/restaurantStore';
import { ProductList } from '@/components/admin/ProductList';
import { ProductForm, type ProductInput } from '@/components/admin/ProductForm';
import type { products, categories } from '@/lib/supabase/types';
import styles from './page.module.css';

type ToastType = 'success' | 'error' | null;

export default function ProductsPage() {
  const router = useRouter();
  const { restauranteSelecionado } = useRestaurantStore();
  const selectedRestaurantId = restauranteSelecionado?.id ?? null;

  // Auth & loading
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Data states
  const [products, setProducts] = useState<products[]>([]);
  const [categories, setCategories] = useState<categories[]>([]);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<products | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Loading states for operations
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast / error state
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

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    if (!selectedRestaurantId) return;

    setIsFetchingProducts(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory) {
        params.set('category_id', selectedCategory);
      }
      params.set('restaurant_id', selectedRestaurantId);
      const queryString = params.toString();
      const url = `/api/admin/products?${queryString}`;

      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao buscar produtos');
      }
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar produtos';
      showToast('error', message);
    } finally {
      setIsFetchingProducts(false);
    }
  }, [selectedCategory, selectedRestaurantId, showToast]);

  // Fetch categories for filter dropdown
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
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, [selectedRestaurantId]);

  // Initialize: check auth and load initial data
  useEffect(() => {
    if (isInitialized) return;

    const init = async () => {
      try {
        const session = await getSession();
        if (!session) {
          router.replace('/admin/login');
          return;
        }
        setLoading(false);
        setIsInitialized(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      }
    };
    init();
  }, [router, isInitialized]);

  // Load data after auth is verified and restaurant is selected
  useEffect(() => {
    if (!isInitialized || !selectedRestaurantId) return;
    const loadData = async () => {
      await fetchCategories();
      await fetchProducts();
    };
    loadData();
  }, [isInitialized, selectedRestaurantId, fetchCategories, fetchProducts]);

  // Open create modal
  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleEdit = (product: products) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  // Open delete confirmation
  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${deletingId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir produto');
      }
      showToast('success', 'Produto excluído com sucesso');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      await fetchProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir produto';
      showToast('error', message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle product availability (via PUT with toggled available)
  const handleToggleAvailability = async (product: products) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !product.available }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao atualizar disponibilidade');
      }
      await fetchProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar disponibilidade';
      showToast('error', message);
    }
  };

  // Handle form submit (create or update)
  const handleSubmit = async (input: ProductInput) => {
    try {
      if (editingProduct) {
        // Update existing
        const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao atualizar produto');
        }
        showToast('success', 'Produto atualizado com sucesso');
      } else {
        // Create new
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...input, restaurant_id: selectedRestaurantId }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao criar produto');
        }
        showToast('success', 'Produto criado com sucesso');
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar produto';
      showToast('error', message);
      throw err; // Let form handle loading state
    }
  };

  // Handle category filter change
  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
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
        <div className={styles.restaurantPrompt}>
          <div className={styles.promptIcon} aria-hidden="true">
            📋
          </div>
          <h2 className={styles.promptTitle}>Nenhum restaurante selecionado</h2>
          <p className={styles.promptText}>
            Selecione um restaurante para gerenciar seus produtos.
          </p>
          <button
            data-testid="select-restaurant-button"
            className={styles.promptButton}
            onClick={() => router.push('/admin/restaurants')}
          >
            Selecionar Restaurante
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
            Produtos
          </h1>
          <span className={styles.restaurantIndicator}>📍 {restauranteSelecionado.nome}</span>
        </div>
        <div className={styles.actions}>
          <button
            data-testid="add-product-button"
            className={styles.addButton}
            onClick={handleAddProduct}
          >
            Adicionar Produto
          </button>
        </div>
      </header>

      {/* Toolbar with filters */}
      <div className={styles.toolbar}>
        <input
          type="search"
          data-testid="search-input"
          className={styles.searchInput}
          placeholder="Buscar produtos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Buscar produtos"
        />
        <select
          data-testid="filter-category-select"
          className={styles.filterSelect}
          value={selectedCategory}
          onChange={handleCategoryFilterChange}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Toast messages */}
      {toast.type && (
        <div
          data-testid={toast.type === 'success' ? 'success-message' : 'error-message'}
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
        >
          {toast.message}
        </div>
      )}

      {/* Product list */}
      <div className={styles.listContainer}>
        {isFetchingProducts ? (
          <div className={styles.loading}>Carregando produtos...</div>
        ) : (
          <ProductList
            products={products}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleAvailability={handleToggleAvailability}
          />
        )}
      </div>

      {/* Modal for create/edit */}
      {isModalOpen && (
        <div data-testid="product-form-modal" className={styles.modal}>
          <div className={styles.modalContent}>
            <ProductForm
              product={editingProduct ?? undefined}
              categories={categories.map((c) => ({ id: c.id, name: c.name }))}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsModalOpen(false);
                setEditingProduct(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal for delete confirmation */}
      {isDeleteModalOpen && (
        <div data-testid="confirm-delete-modal" className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Confirmar Exclusão</h2>
            <p className={styles.modalText}>
              Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
            </p>
            <div className={styles.modalActions}>
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
                className={styles.deleteButton}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
