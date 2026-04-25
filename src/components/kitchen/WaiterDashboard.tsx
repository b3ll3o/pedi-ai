'use client'

import { useState, useEffect, useRef } from 'react'
import type { KitchenOrder } from '@/hooks/useKitchenOrders'
import { KitchenDisplay } from './KitchenDisplay'
import { OrderNotification } from './OrderNotification'
import { ConnectionStatus } from './ConnectionStatus'
import { useKitchenOrders } from '@/hooks/useKitchenOrders'
import { updateOrderStatus } from '@/services/adminOrderService'
import styles from './WaiterDashboard.module.css'

interface WaiterDashboardProps {
  restaurantId: string
}

export function WaiterDashboard({ restaurantId }: WaiterDashboardProps) {
  const [newOrder, setNewOrder] = useState<KitchenOrder | null>(null)
  const {
    pendingOrders,
    preparingOrders,
    readyOrders,
    isConnected,
    refetch,
  } = useKitchenOrders({
    restaurantId,
    enabled: true,
  })

  // Check for new pending orders to show notification
  const prevOrderIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (pendingOrders.length > 0) {
      const newestPending = pendingOrders[0]
      if (prevOrderIdRef.current !== newestPending.id) {
        prevOrderIdRef.current = newestPending.id
        setNewOrder(newestPending)
      }
    }
  }, [pendingOrders])

  const handleAcceptOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'confirmed')
      setNewOrder(null)
      refetch()
    } catch (err) {
      console.error('Failed to accept order:', err)
    }
  }

  const handleRejectOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'cancelled', 'Recusado pelo garçom')
      setNewOrder(null)
      refetch()
    } catch (err) {
      console.error('Failed to reject order:', err)
    }
  }

  const handleDismissNotification = () => {
    setNewOrder(null)
  }

  const handleMarkReady = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'ready')
      refetch()
    } catch (err) {
      console.error('Failed to mark order as ready:', err)
    }
  }

  const handleViewDetails = (_orderId: string) => {
    // Could open a modal or navigate to details page
  }

  return (
    <div className={styles.container}>
      <KitchenDisplay
        pendingOrders={pendingOrders}
        preparingOrders={preparingOrders}
        readyOrders={readyOrders}
        isConnected={isConnected}
        onAcceptOrder={handleAcceptOrder}
        onMarkReady={handleMarkReady}
        onViewDetails={handleViewDetails}
      />

      {newOrder && (
        <OrderNotification
          order={newOrder}
          onAccept={() => handleAcceptOrder(newOrder.id)}
          onReject={() => handleRejectOrder(newOrder.id)}
          onDismiss={handleDismissNotification}
        />
      )}

      {!isConnected && (
        <div className={styles.offlineBanner}>
          <ConnectionStatus isConnected={isConnected} variant="banner" />
        </div>
      )}
    </div>
  )
}
