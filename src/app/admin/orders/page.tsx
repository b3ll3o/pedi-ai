'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/supabase/auth';
import { useRestaurantStore } from '@/stores/restaurantStore';
import styles from './page.module.css';

export default function OrdersPage() {
  const router = useRouter();
  const { restauranteSelecionado } = useRestaurantStore();
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

  // TODO: Quando API de pedidos estiver implementada, filtrar por restauranteSelecionado.id
  useEffect(() => {
    if (restauranteSelecionado) {
      console.log('[Orders] Filtrando pedidos para restaurante:', restauranteSelecionado.id);
    }
  }, [restauranteSelecionado]);

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
          <div className={styles.promptIcon}>🍽️</div>
          <h2 className={styles.promptTitle}>Nenhum restaurante selecionado</h2>
          <p className={styles.promptText}>
            Para visualizar os pedidos, selecione um restaurante primeiro.
          </p>
          <button
            className={styles.promptButton}
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
          <h1 className={styles.title} data-testid="page-title">Pedidos</h1>
          <span className={styles.restaurantIndicator} data-testid="restaurant-indicator">
            📍 {restauranteSelecionado.nome}
          </span>
        </div>
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
