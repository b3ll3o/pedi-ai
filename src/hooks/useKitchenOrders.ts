/**
 * useKitchenOrders Hook
 * Specialized hook for kitchen display - orders sorted by age.
 */

import { useMemo } from 'react'
import { useRealtimeOrders, type UseRealtimeOrdersOptions } from './useRealtimeOrders'
import type { OrderWithItems } from '@/services/adminOrderService'
import { getOrderAge, getOrderAgeDisplay, isOrderStale } from '@/services/adminOrderService'

export interface KitchenOrder extends OrderWithItems {
  age_seconds: number
  age_display: string
  is_stale: boolean
}

export interface UseKitchenOrdersOptions extends UseRealtimeOrdersOptions {
  staleThresholdSeconds?: number
}

export interface UseKitchenOrdersResult {
  orders: KitchenOrder[]
  pendingOrders: KitchenOrder[]
  preparingOrders: KitchenOrder[]
  readyOrders: KitchenOrder[]
  isLoading: boolean
  error: Error | null
  isConnected: boolean
  refetch: () => void
}

export function useKitchenOrders({
  staleThresholdSeconds = 300,
  ...options
}: UseKitchenOrdersOptions = {}): UseKitchenOrdersResult {
  const { orders, isLoading, error, isConnected, refetch } = useRealtimeOrders(options)

  // Add age and stale info to each order
  const processedOrders = useMemo<KitchenOrder[]>(() => {
    return orders.map((order) => {
      const age_seconds = getOrderAge(order)
      return {
        ...order,
        age_seconds,
        age_display: getOrderAgeDisplay(age_seconds),
        is_stale: isOrderStale(order, staleThresholdSeconds),
      }
    })
  }, [orders, staleThresholdSeconds])

  // Sort by age (oldest first)
  const sortedOrders = useMemo(() => {
    return [...processedOrders].sort((a, b) => b.age_seconds - a.age_seconds)
  }, [processedOrders])

  // Filter by status
  const pendingOrders = useMemo(
    () => sortedOrders.filter((o) => o.status === 'pending_payment'),
    [sortedOrders]
  )

  const preparingOrders = useMemo(
    () => sortedOrders.filter((o) => o.status === 'preparing'),
    [sortedOrders]
  )

  const readyOrders = useMemo(
    () => sortedOrders.filter((o) => o.status === 'ready'),
    [sortedOrders]
  )

  return {
    orders: sortedOrders,
    pendingOrders,
    preparingOrders,
    readyOrders,
    isLoading,
    error,
    isConnected,
    refetch,
  }
}
