'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import styles from './page.module.css';

export default function ProductsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 data-testid="page-title" className={styles.title}>Produtos</h1>
        <div className={styles.actions}>
          <button data-testid="add-product-button" className={styles.addButton} onClick={() => setIsModalOpen(true)}>
            Adicionar Produto
          </button>
        </div>
      </header>
      <div className={styles.toolbar}>
        <input
          type="search"
          data-testid="search-input"
          className={styles.searchInput}
          placeholder="Buscar produtos..."
          aria-label="Buscar produtos"
        />
        <select
          data-testid="filter-category-select"
          className={styles.filterSelect}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
        </select>
      </div>
      <div data-testid="success-message" className={styles.successMessage} hidden />
      <div data-testid="error-message" className={styles.errorMessage} hidden />
      <div data-testid="field-error" className={styles.fieldError} hidden />
      <div className={styles.placeholder}>
        Grade de produtos aparecerá aqui
      </div>

      {/* Modal de adição/edição de produto */}
      <div data-testid="product-form-modal" className={styles.modal} hidden={!isModalOpen}>
        <input data-testid="product-name-input" type="text" placeholder="Nome do produto" />
        <input data-testid="product-price-input" type="number" placeholder="Preço" />
        <select data-testid="product-category-select"><option value="">Selecione...</option></select>
        <input data-testid="product-description-input" type="text" placeholder="Descrição" />
        <input data-testid="product-image-input" type="file" accept="image/*" />
        <button data-testid="save-button" onClick={() => setIsModalOpen(false)}>Salvar</button>
        <button data-testid="cancel-button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
      </div>

      {/* Modal de confirmação de delete */}
      <div data-testid="confirm-delete-modal" className={styles.modal} hidden={!isDeleteModalOpen}>
        <p>Confirmar exclusão?</p>
        <button data-testid="confirm-delete-button" onClick={() => setIsDeleteModalOpen(false)}>Confirmar</button>
        <button data-testid="cancel-delete-button" onClick={() => setIsDeleteModalOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}
