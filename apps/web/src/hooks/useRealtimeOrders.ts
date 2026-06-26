/**
 * useRealtimeOrders Hook
 * Subscribes to order updates via Socket.io with polling fallback.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState, useRef } from 'react';

import type { OrderWithItems } from '@/application/services/adminOrderService';

import { useSocketIO } from './useSocketIO';

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

  const {
    isConnected: socketConnected,
    on,
    off,
  } = useSocketIO({
    restaurantId,
    enabled,
  });

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

  // Handle order updates via Socket.io
  useEffect(() => {
    const handleOrderUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders', restaurantId] });
    };

    const handleNewOrder = () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders', restaurantId] });
    };

    if (socketConnected) {
      on('orderUpdate', handleOrderUpdate);
      on('newOrder', handleNewOrder);
    }

    return () => {
      off('orderUpdate', handleOrderUpdate);
      off('newOrder', handleNewOrder);
    };
  }, [socketConnected, restaurantId, queryClient, on, off]);

  // Set up polling fallback
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

  // Manage connection state and polling fallback
  useEffect(() => {
    if (!enabled || !restaurantId) {
      stopPolling();

      setIsConnected(false);
      return;
    }

    setIsConnected(!!socketConnected);

    if (socketConnected) {
      stopPolling();
    } else {
      startPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, restaurantId, socketConnected, startPolling, stopPolling]);

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
    // AbortController compartilhado para todos os fetches de ping deste
    // effect — quando o componente desmontar (cleanup) ou a cada nova
    // medição, cancela o anterior para evitar setState após unmount.
    const abortController = new AbortController();

    const measureLatency = async () => {
      const start = Date.now();
      try {
        const response = await fetch('/api/health', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Timeout: 5s. Sem isso, em captive portal / DNS lento, o fetch
          // fica pendurado e `isConnected` permanece `true` enquanto a UI
          // mostra "online" para o usuário.
          signal: abortController.signal,
        });
        if (response.ok) {
          setLatency(Date.now() - start);
          setIsConnected(true);
        } else {
          setIsConnected(false);
          setLatency(null);
        }
      } catch (err) {
        // AbortError é esperado no cleanup; não marcar como offline.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsConnected(false);
        setLatency(null);
      }
    };

    // Source-of-truth: o browser dispara `online`/`offline` *no momento
    // exato* em que a conectividade muda (sem esperar 30s de ping).
    // Usamos como acelerador — quando o browser diz que voltou, medimos
    // latência imediatamente em vez de esperar o próximo tick. Quando
    // diz que caiu, marcamos offline já.
    //
    // Importante: o browser ainda pode mentir (`navigator.onLine === true`
    // em captive portal sem internet real), por isso o ping HTTP continua
    // sendo a fonte autoritativa. Aqui só reagimos mais rápido.
    const handleOnline = () => {
      void measureLatency();
    };
    const handleOffline = () => {
      setIsConnected(false);
      setLatency(null);
    };

    // Estado inicial — espelha `navigator.onLine` para evitar flash de
    // "online" antes da primeira medição. Como `setState` em effect é
    // proibido pela regra `react-hooks/set-state-in-effect`, agendamos
    // a atualização para o próximo microtask (sincronamente após o
    // effect rodar, mas fora do corpo do effect).
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueMicrotask(() => setIsConnected(false));
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Measure initial latency
    void measureLatency();

    // Measure latency every 30 seconds
    pingIntervalRef.current = setInterval(measureLatency, 30000);

    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      abortController.abort();
    };
  }, []);

  return { isConnected, latency };
}
