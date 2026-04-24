'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import styles from './page.module.css';

export default function OrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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
        <h1 className={styles.title} data-testid="page-title">Pedidos</h1>
      </header>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Buscar pedidos..."
          data-testid="search-orders-input"
          className={styles.searchInput}
        />
        <input
          type="date"
          data-testid="filter-date-input"
          className={styles.filterInput}
        />
        <select data-testid="filter-status-select" className={styles.filterSelect}>
          <option value="">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="preparing">Preparando</option>
          <option value="ready">Pronto</option>
          <option value="delivered">Entregue</option>
        </select>
      </div>
      <div className={styles.placeholder}>
        Lista de pedidos aparecerá aqui
      </div>

      {/* Stub para lista de pedidos */}
      <div className={styles.ordersList}>
        <div data-testid="admin-order-item">
          <div data-testid="order-card">
          <span data-testid="order-id">#123</span>
          <span data-testid="order-status">pending</span>
          <button data-testid="view-details-button" onClick={() => setIsDetailsModalOpen(true)}>Ver detalhes</button>
          <button data-testid="update-status-button" onClick={() => setIsDetailsModalOpen(true)}>Atualizar status</button>
          <button data-testid="cancel-order-button">Cancelar</button>
          </div>
        </div>
      </div>

      {/* Modal de detalhes do pedido */}
      <div data-testid="order-details-modal" className={styles.modal} hidden={!isDetailsModalOpen}>
        <select data-testid="order-status-select">
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="preparing">Preparando</option>
          <option value="ready">Pronto</option>
          <option value="delivered">Entregue</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <button data-testid="confirm-status-update" onClick={() => setIsDetailsModalOpen(false)}>Confirmar</button>
        <button data-testid="cancel-order-modal-button" onClick={() => setIsDetailsModalOpen(false)}>Cancelar</button>
      </div>
    </div>
  );
}
