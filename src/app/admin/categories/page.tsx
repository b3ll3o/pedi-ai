'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import styles from './page.module.css';

export default function CategoriesPage() {
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
        <h1 data-testid="page-title" className={styles.title}>Categorias</h1>
        <div className={styles.actions}>
          <button data-testid="add-category-button" className={styles.addButton} onClick={() => setIsModalOpen(true)}>
            Adicionar Categoria
          </button>
        </div>
      </header>
      <div data-testid="search-input" className={styles.searchPlaceholder}>
        <input type="text" placeholder="Buscar categorias..." aria-label="Buscar categorias" />
      </div>
      <div data-testid="success-message" className={styles.successMessage} aria-live="polite" />
      <div data-testid="error-message" className={styles.errorMessage} aria-live="assertive" />
      <div data-testid="field-error" className={styles.fieldError} aria-live="polite" />
      <div className={styles.placeholder}>
        Lista de categorias aparecerá aqui
      </div>

      {/* Modal de adição/edição de categoria */}
      <div data-testid="category-form-modal" className={styles.modal} hidden={!isModalOpen}>
        <input data-testid="category-name-input" type="text" placeholder="Nome da categoria" />
        <input data-testid="category-description-input" type="text" placeholder="Descrição" />
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
