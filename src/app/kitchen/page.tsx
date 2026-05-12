'use client'

import { useState, useCallback } from 'react'
import { usePedidosKDS } from '@/hooks/usePedidosKDS'
import { OrderList } from '@/components/kds/OrderList'
import { StatusFilter } from '@/components/kds/StatusFilter'
import { ConnectionStatus } from '@/components/kitchen/ConnectionStatus'
import type { OrderStatus } from '@/services/adminOrderService'
import styles from './page.module.css'

type FilterStatus = OrderStatus | 'all'

export default function KitchenPage() {
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>('all')
  const [somAtivado, setSomAtivado] = useState(true)

  const restauranteId = 'demo-restaurant'

  const {
    pedidos,
    pedidosRecebidos,
    pedidosPreparando,
    pedidosProntos,
    isLoading,
    error,
    isConnected,
    refetch,
    atualizarStatusPedido,
  } = usePedidosKDS({
    restauranteId,
    somAtivado,
  })

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: OrderStatus) => {
      try {
        await atualizarStatusPedido(orderId, newStatus)
      } catch (err) {
        console.error('Erro ao atualizar status:', err)
      }
    },
    [atualizarStatusPedido]
  )

  const handleAcceptOrder = useCallback(
    (orderId: string) => {
      handleStatusChange(orderId, 'preparing')
    },
    [handleStatusChange]
  )

  const handleMarkReady = useCallback(
    (orderId: string) => {
      handleStatusChange(orderId, 'ready')
    },
    [handleStatusChange]
  )

  const handleViewDetails = useCallback((orderId: string) => {
    console.log('Ver detalhes do pedido:', orderId)
  }, [])

  const counts = {
    all: pedidos.length,
    paid: pedidosRecebidos.length,
    preparing: pedidosPreparando.length,
    ready: pedidosProntos.length,
  } as Record<FilterStatus, number>

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Kitchen Display</h1>
        <div className={styles.headerControls}>
          <ConnectionStatus isConnected={isConnected} />
          <label className={styles.soundToggle}>
            <input
              type="checkbox"
              checked={somAtivado}
              onChange={(e) => setSomAtivado(e.target.checked)}
            />
            Som
          </label>
        </div>
      </header>

      <StatusFilter
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        counts={counts}
      />

      {error && (
        <div className={styles.error} role="alert">
          <p>Erro ao carregar pedidos: {error.message}</p>
          <button onClick={() => refetch()}>Tentar novamente</button>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <p>Carregando pedidos...</p>
        </div>
      ) : (
        <OrderList
          orders={pedidos}
          selectedStatus={selectedStatus}
          onAcceptOrder={handleAcceptOrder}
          onMarkReady={handleMarkReady}
          onViewDetails={handleViewDetails}
        />
      )}
    </div>
  )
}
