'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSession } from '@/lib/supabase/auth'
import { useRestaurantStore } from '@/stores/restaurantStore'
import { getOrders, updateOrderStatus, type OrderWithItems, type OrderStatus } from '@/services/adminOrderService'
import { OrderList } from '@/components/admin/OrderList'
import { OrderDetailAdmin } from '@/components/admin/OrderDetailAdmin'
import styles from './page.module.css'

export default function OrdersPage() {
  const router = useRouter()
  const { restauranteSelecionado } = useRestaurantStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const fetchOrders = useCallback(async () => {
    if (!restauranteSelecionado) return

    setIsLoadingOrders(true)
    setError(null)

    try {
      const result = await getOrders({
        restaurant_id: restauranteSelecionado.id,
        limit: 100,
      })
      setOrders(result.orders)
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err)
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos')
    } finally {
      setIsLoadingOrders(false)
    }
  }, [restauranteSelecionado])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await getSession()
        if (!session) {
          router.replace('/admin/login')
          return
        }
        setLoading(false)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.replace('/admin/login')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (restauranteSelecionado) {
      fetchOrders()
    }
  }, [restauranteSelecionado, fetchOrders])

  const handleViewDetails = useCallback((orderId: string) => {
    setSelectedOrderId(orderId)
    setIsDetailsModalOpen(true)
  }, [])

  const handleUpdateStatus = useCallback(async (orderId: string, status: OrderStatus, notes?: string) => {
    try {
      await updateOrderStatus(orderId, status, notes)
      await fetchOrders()
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }, [fetchOrders])

  const handleCancel = useCallback(async (orderId: string, reason?: string) => {
    try {
      await updateOrderStatus(orderId, 'cancelled', reason)
      setIsDetailsModalOpen(false)
      setSelectedOrderId(null)
      await fetchOrders()
    } catch (err) {
      console.error('Erro ao cancelar pedido:', err)
      alert(err instanceof Error ? err.message : 'Erro ao cancelar pedido')
    }
  }, [fetchOrders])

  const handleCloseModal = useCallback(() => {
    setIsDetailsModalOpen(false)
    setSelectedOrderId(null)
  }, [])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Carregando...</div>
      </div>
    )
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
    )
  }

  const selectedOrder = orders.find(o => o.id === selectedOrderId)

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

      {error && (
        <div className={styles.error} data-testid="error-message">
          {error}
        </div>
      )}

      <OrderList
        orders={orders}
        onViewDetails={handleViewDetails}
        onUpdateStatus={handleUpdateStatus}
        isLoading={isLoadingOrders}
      />

      {isDetailsModalOpen && selectedOrder && (
        <OrderDetailAdmin
          order={selectedOrder}
          onUpdateStatus={handleUpdateStatus}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}