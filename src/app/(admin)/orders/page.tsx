'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { OrderList } from '@/components/admin/OrderList'
import { getOrders, updateOrderStatus, type OrderStatus } from '@/services/adminOrderService'
import type { OrderWithItems } from '@/services/adminOrderService'
import styles from './page.module.css'

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load orders on mount
  useState(() => {
    const loadOrders = async () => {
      try {
        const restaurantId = 'demo-restaurant'
        const result = await getOrders({ restaurant_id: restaurantId })
        setOrders(result.orders)
      } catch (err) {
        console.error('Failed to load orders:', err)
        setError('Erro ao carregar pedidos')
      } finally {
        setIsLoading(false)
      }
    }
    loadOrders()
  })

  const handleViewDetails = useCallback(
    (orderId: string) => {
      router.push(`/admin/pedidos/${orderId}`)
    },
    [router]
  )

  const handleUpdateStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      try {
        await updateOrderStatus(orderId, status)
        // Refresh orders
        const restaurantId = 'demo-restaurant'
        const result = await getOrders({ restaurant_id: restaurantId })
        setOrders(result.orders)
      } catch (err) {
        console.error('Failed to update status:', err)
        alert('Erro ao atualizar status')
      }
    },
    []
  )

  return (
    <AdminLayout>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>Pedidos</h1>
            <p className={styles.subtitle}>Gerencie os pedidos do restaurante</p>
          </div>
        </header>

        {error && <div className={styles.error}>{error}</div>}

        <OrderList
          orders={orders}
          onViewDetails={handleViewDetails}
          onUpdateStatus={handleUpdateStatus}
          isLoading={isLoading}
        />
      </div>
    </AdminLayout>
  )
}
