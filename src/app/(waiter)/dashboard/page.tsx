'use client'

import { useEffect, useState } from 'react'
import { WaiterDashboard } from '@/components/kitchen/WaiterDashboard'
import { ConnectionStatus } from '@/components/kitchen/ConnectionStatus'
import { useRealtimeConnection } from '@/hooks/useRealtimeOrders'

export default function WaiterDashboardPage() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const { isConnected, latency } = useRealtimeConnection()

  useEffect(() => {
    // In a real app, get restaurantId from auth context
    setRestaurantId('demo-restaurant')
  }, [])

  if (!restaurantId) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#6b7280' }}>
        Carregando...
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 100 }}>
        <ConnectionStatus isConnected={isConnected} latency={latency} variant="badge" />
      </div>
      <WaiterDashboard restaurantId={restaurantId} />
    </div>
  )
}
