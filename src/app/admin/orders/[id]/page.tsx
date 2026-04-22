'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { OrderDetailAdmin } from '@/components/admin/OrderDetailAdmin'
import { getOrder, updateOrderStatus, type OrderStatus } from '@/services/adminOrderService'
import type { OrderWithItems } from '@/services/adminOrderService'

export default function OrderDetailPage() {
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<OrderWithItems | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const data = await getOrder(orderId)
        setOrder(data)
      } catch (err) {
        console.error('Failed to load order:', err)
        setError('Erro ao carregar pedido')
      } finally {
        setIsLoading(false)
      }
    }
    loadOrder()
  }, [orderId])

  const handleUpdateStatus = useCallback(
    async (id: string, status: OrderStatus, notes?: string) => {
      try {
        await updateOrderStatus(id, status, notes)
        // Refresh order
        const data = await getOrder(id)
        setOrder(data)
      } catch (err) {
        console.error('Failed to update status:', err)
        throw err
      }
    },
    []
  )

  const handleCancel = useCallback(
    async (id: string, reason?: string) => {
      try {
        await updateOrderStatus(id, 'cancelled', reason)
        // Refresh order
        const data = await getOrder(id)
        setOrder(data)
      } catch (err) {
        console.error('Failed to cancel order:', err)
        throw err
      }
    },
    []
  )

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
        Carregando...
      </div>
    )
  }

  if (error || !order) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>{error || 'Pedido não encontrado'}</h2>
      </div>
    )
  }

  return (
    <OrderDetailAdmin
      order={order}
      onUpdateStatus={handleUpdateStatus}
      onCancel={handleCancel}
    />
  )
}