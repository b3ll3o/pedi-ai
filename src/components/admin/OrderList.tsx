'use client'

import { useState, useMemo } from 'react'
import type { OrderWithItems, OrderStatus } from '@/services/adminOrderService'
import styles from './OrderList.module.css'

interface OrderListProps {
  orders: OrderWithItems[]
  onViewDetails: (orderId: string) => void
  onUpdateStatus: (orderId: string, status: OrderStatus) => void
  isLoading?: boolean
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Aguardando Pagamento',
  paid: 'Pago',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending_payment: '#f59e0b',
  paid: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#10b981',
  delivered: '#059669',
  cancelled: '#ef4444',
}

export function OrderList({
  orders,
  onViewDetails,
  onUpdateStatus,
  isLoading,
}: OrderListProps) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all')
  const [sortBy, setSortBy] = useState<'date' | 'total'>('date')

  const filtered = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesSearch =
          order.id.toLowerCase().includes(search.toLowerCase()) ||
          order.table?.number?.toString().includes(search) ||
          order.table?.name?.toLowerCase().includes(search.toLowerCase())

        const matchesStatus = filterStatus === 'all' || order.status === filterStatus

        return matchesSearch && matchesStatus
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        return b.total - a.total
      })
  }, [orders, search, filterStatus, sortBy])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price)
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando pedidos...</div>
      </div>
    )
  }

  return (
    <div className={styles.container} data-testid="order-details-modal">
      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.search}
          placeholder="Buscar por ID ou mesa..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar pedidos"
        />
        <select
          className={styles.filter}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
          aria-label="Filtrar por status"
        >
          <option value="all">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className={styles.sort}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'date' | 'total')}
          aria-label="Ordenar por"
        >
          <option value="date">Mais recentes</option>
          <option value="total">Maior valor</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📋</span>
          <p>Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className={styles.list} data-testid="admin-order-item">
          {filtered.map((order) => (
            <div key={order.id} className={styles.orderCard} data-testid="order-card">
              <div className={styles.orderHeader}>
                <span
                  className={styles.statusBadge}
                  style={{ backgroundColor: STATUS_COLORS[order.status] }}
                  data-testid="order-status"
                >
                  {STATUS_LABELS[order.status]}
                </span>
                <span className={styles.orderId} data-testid="order-id">#{order.id.slice(0, 8)}</span>
              </div>

              <div className={styles.orderInfo}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Mesa:</span>
                  <span className={styles.infoValue}>
                    {order.table?.name || `Mesa ${order.table?.number}` || '-'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Data:</span>
                  <span className={styles.infoValue}>{formatDate(order.created_at)}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Itens:</span>
                  <span className={styles.infoValue}>
                    {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Total:</span>
                  <span className={`${styles.infoValue} ${styles.total}`}>
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.viewButton}
                  onClick={() => onViewDetails(order.id)}
                  data-testid="view-details-button"
                >
                  Ver Detalhes
                </button>
                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                  <span data-testid="update-status-button">
                    <select
                      className={styles.statusSelect}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          onUpdateStatus(order.id, e.target.value as OrderStatus)
                        }
                      }}
                      aria-label="Atualizar status"
                      data-testid="order-status-select"
                    >
                      <option value="">Atualizar status...</option>
                      {order.status === 'pending_payment' && <option value="paid">Confirmar Pagamento</option>}
                      {order.status === 'paid' && <option value="preparing">Iniciar preparo</option>}
                      {order.status === 'preparing' && <option value="ready">Marcar como pronto</option>}
                      {order.status === 'ready' && <option value="delivered">Marcar como entregue</option>}
                      <option value="cancelled">Cancelar</option>
                    </select>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.summary}>
        Mostrando {filtered.length} de {orders.length} pedidos
      </div>
    </div>
  )
}
