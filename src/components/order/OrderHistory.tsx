"use client"

import { useState, useEffect } from 'react'
import { Clock, ChevronRight, Package } from 'lucide-react'
import styles from './OrderHistory.module.css'

interface OrderSummary {
  id: string
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
  total: number
  created_at: string
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed'
}

interface OrderHistoryProps {
  customerId: string
  restaurantId: string
  onOrderClick?: (orderId: string) => void
}

const formatPrice = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const statusLabels: Record<OrderSummary['status'], string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
}

const statusColors: Record<OrderSummary['status'], string> = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#10b981',
  delivered: '#22c55e',
  cancelled: '#ef4444',
}

export function OrderHistory({ customerId, restaurantId, onOrderClick }: OrderHistoryProps) {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(
          `/api/orders?customer_id=${customerId}&restaurant_id=${restaurantId}`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch orders')
        }

        const data = await response.json()
        setOrders(data)
      } catch (err) {
        setError('Erro ao carregar pedidos')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    if (customerId && restaurantId) {
      fetchOrders()
    }
  }, [customerId, restaurantId])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Carregando pedidos...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <Package className={styles.emptyIcon} />
          <p className={styles.emptyText}>Nenhum pedido encontrado</p>
          <p className={styles.emptySubtext}>Seus pedidos aparecerão aqui</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Meus Pedidos</h2>
      <div className={styles.list}>
        {orders.map((order) => (
          <button
            key={order.id}
            className={styles.orderCard}
            onClick={() => onOrderClick?.(order.id)}
            type="button"
          >
            <div className={styles.orderHeader}>
              <span className={styles.orderId}>#{order.id.slice(0, 8)}</span>
              <span
                className={styles.status}
                style={{ color: statusColors[order.status] }}
              >
                {statusLabels[order.status]}
              </span>
            </div>
            <div className={styles.orderDetails}>
              <div className={styles.orderMeta}>
                <Clock className={styles.metaIcon} />
                <span>{formatDate(order.created_at)}</span>
              </div>
              <span className={styles.orderTotal}>{formatPrice(order.total)}</span>
            </div>
            <ChevronRight className={styles.chevron} />
          </button>
        ))}
      </div>
    </div>
  )
}