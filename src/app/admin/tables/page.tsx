'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import styles from './page.module.css';

export default function TablesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        <h1 data-testid="page-title" className={styles.title}>Mesas</h1>
        <div className={styles.actions}>
          <button data-testid="add-table-button" className={styles.addButton} onClick={() => setIsModalOpen(true)}>
            Adicionar Mesa
          </button>
        </div>
      </header>
      <div data-testid="success-message" className={styles.successMessage} />
      <div data-testid="error-message" className={styles.errorMessage} />
      <div className={styles.placeholder}>
        Lista de mesas com QR codes aparecerá aqui
      </div>

      {/* Modal de adição/edição de mesa */}
      <div data-testid="table-form-modal" className={styles.modal} hidden={!isModalOpen}>
        <input data-testid="table-name-input" type="text" placeholder="Nome/numero da mesa" />
        <label>
          <input data-testid="generate-qr-checkbox" type="checkbox" />
          Gerar QR Code
        </label>
        <button data-testid="save-button" onClick={() => setIsModalOpen(false)}>Salvar</button>
        <button data-testid="cancel-button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}
