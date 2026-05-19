/**
 * useRealtimeOrders Hook
 * Subscribes to order updates via polling (Supabase realtime removed).
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrderWithItems } from '@/application/services/adminOrderService';

const POLLING_INTERVAL = 10000; // 10 seconds

export interface UseRealtimeOrdersOptions {
  restaurantId?: string;
  enabled?: boolean;
  pollingInterval?: number;
}

export interface UseRealtimeOrdersResult {
  orders: OrderWithItems[];
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  refetch: () => void;
}

export function useRealtimeOrders({
  restaurantId,
  enabled = true,
  pollingInterval = POLLING_INTERVAL,
}: UseRealtimeOrdersOptions): UseRealtimeOrdersResult {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [error, _setError] = useState<Error | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Query for orders
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', restaurantId],
    queryFn: async (): Promise<OrderWithItems[]> => {
      const params = new URLSearchParams();
      params.set('restaurant_id', restaurantId ?? '');
      params.set('status', 'pending_payment,paid,preparing,ready'); // Active orders

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();
      return result.orders || [];
    },
    enabled: enabled && !!restaurantId,
    staleTime: 5000,
  });

  // Set up polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(() => {
      refetch();
    }, pollingInterval);
  }, [pollingInterval, refetch]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Set up polling for order updates
  useEffect(() => {
    if (!enabled || !restaurantId) {
      stopPolling();
      setIsConnected(false);
      return;
    }

    // Start polling
    setIsConnected(true);
    startPolling();

    return () => {
      stopPolling();
    };
  }, [enabled, restaurantId, startPolling, stopPolling]);

  return {
    orders: data || [],
    isLoading,
    error,
    isConnected,
    refetch,
  };
}

// ── Connection Status Hook ──────────────────────────────────

export function useRealtimeConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const measureLatency = async () => {
      const start = Date.now();
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (response.ok) {
          setLatency(Date.now() - start);
          setIsConnected(true);
        } else {
          setIsConnected(false);
          setLatency(null);
        }
      } catch {
        setIsConnected(false);
        setLatency(null);
      }
    };

    // Measure initial latency
    measureLatency();

    // Measure latency every 30 seconds
    pingIntervalRef.current = setInterval(measureLatency, 30000);

    return () => {
      /* istanbul ignore if */ if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, []);

  return { isConnected, latency };
}
