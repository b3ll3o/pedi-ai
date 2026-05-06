/**
 * useRealtimeOrders Hook
 * Subscribes to order updates via Supabase Realtime with polling fallback.
 */

import { useEffect, useCallback, useState, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { OrderWithItems } from '@/services/adminOrderService'

const POLLING_INTERVAL = 10000 // 10 seconds fallback

export interface UseRealtimeOrdersOptions {
  restaurantId?: string
  enabled?: boolean
  pollingInterval?: number
}

export interface UseRealtimeOrdersResult {
  orders: OrderWithItems[]
  isLoading: boolean
  error: Error | null
  isConnected: boolean
  refetch: () => void
}

export function useRealtimeOrders({
  restaurantId,
  enabled = true,
  pollingInterval = POLLING_INTERVAL,
}: UseRealtimeOrdersOptions): UseRealtimeOrdersResult {
  const queryClient = useQueryClient()
  const [isConnected, setIsConnected] = useState(false)
  const [error, _setError] = useState<Error | null>(null)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // Query for orders
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', restaurantId],
    queryFn: async (): Promise<OrderWithItems[]> => {
      const params = new URLSearchParams()
      params.set('restaurant_id', restaurantId ?? '')
      params.set('status', 'pending_payment,paid,preparing,ready') // Active orders

      const response = await fetch(`/api/admin/orders?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch orders')
      }

      const result = await response.json()
      return result.orders || []
    },
    enabled: enabled && !!restaurantId,
    staleTime: 5000,
  })

  // Set up polling fallback
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
    }
    pollingRef.current = setInterval(() => {
      refetch()
    }, pollingInterval)
  }, [pollingInterval, refetch])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!enabled || !restaurantId) {
      stopPolling()
      return
    }

    const supabase = createClient()

    const channel = supabase
      .channel('admin-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        /* istanbul ignore next */ (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin-orders', restaurantId] })
          setIsConnected(true)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        /* istanbul ignore next */ (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin-orders', restaurantId] })
          setIsConnected(true)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_items',
        },
        /* istanbul ignore next */ (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin-orders', restaurantId] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_items',
        },
        /* istanbul ignore next */ (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin-orders', restaurantId] })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'order_items',
        },
        /* istanbul ignore next */ (_payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin-orders', restaurantId] })
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          stopPolling()
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
          startPolling()
        }
      })

    // Start polling as backup
    startPolling()

    return () => {
      stopPolling()
      supabase.removeChannel(channel)
    }
  }, [enabled, restaurantId, queryClient, startPolling, stopPolling])

  return {
    orders: data || [],
    isLoading,
    error,
    isConnected,
    refetch,
  }
}

// ── Connection Status Hook ──────────────────────────────────

export function useRealtimeConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [latency, setLatency] = useState<number | null>(null)
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const measureLatency = async () => {
      const start = Date.now()
      try {
        await supabase.from('restaurants').select('id').limit(1)
        setLatency(Date.now() - start)
        setIsConnected(true)
      } catch {
        setIsConnected(false)
        setLatency(null)
      }
    }

    // Measure initial latency
    measureLatency()

    // Measure latency every 30 seconds
    pingIntervalRef.current = setInterval(measureLatency, 30000)

    return () => {
      /* istanbul ignore if */ if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [])

  return { isConnected, latency }
}
