/**
 * usePedidosKDS Hook
 * Hook para Kitchen Display System (KDS) - lista pedidos e atualiza via Socket.io com polling fallback.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useState, useRef, useMemo } from 'react';

import type { OrderWithItems, OrderStatus } from '@/application/services/adminOrderService';
import {
  getOrderAge,
  getOrderAgeDisplay,
  isOrderStale,
} from '@/application/services/adminOrderService';

import { useSocketIO } from './useSocketIO';

export interface PedidoKDS extends OrderWithItems {
  age_seconds: number;
  age_display: string;
  is_stale: boolean;
}

export interface UsePedidosKDSOptions {
  restauranteId?: string;
  enabled?: boolean;
  staleThresholdSeconds?: number;
  somAtivado?: boolean;
}

export interface UsePedidosKDSResult {
  pedidos: PedidoKDS[];
  pedidosRecebidos: PedidoKDS[];
  pedidosPreparando: PedidoKDS[];
  pedidosProntos: PedidoKDS[];
  isLoading: boolean;
  error: Error | null;
  isConnected: boolean;
  refetch: () => void;
  atualizarStatusPedido: (id: string, status: OrderStatus) => Promise<void>;
}

const KDS_STATUSES: OrderStatus[] = ['paid', 'preparing', 'ready'];
const POLLING_INTERVAL = 5000; // 5 seconds

async function tocarSomNovoPedido(): Promise<void> {
  try {
    const audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch {
    console.warn('Não foi possível tocar o som de novo pedido');
  }
}

export function usePedidosKDS({
  restauranteId,
  enabled = true,
  staleThresholdSeconds = 300,
  somAtivado = true,
}: UsePedidosKDSOptions = {}): UsePedidosKDSResult {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const soundPlayedRef = useRef<Set<string>>(new Set());
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  const {
    isConnected: socketConnected,
    on,
    off,
  } = useSocketIO({
    restaurantId: restauranteId,
    enabled,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['kds-pedidos', restauranteId],
    queryFn: async (): Promise<OrderWithItems[]> => {
      const params = new URLSearchParams();
      params.set('restaurant_id', restauranteId ?? '');
      params.set('status', KDS_STATUSES.join(','));

      const response = await fetch(`/api/admin/orders?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Falha ao buscar pedidos do KDS');
      }

      const result = await response.json();
      return result.orders || [];
    },
    enabled: enabled && !!restauranteId,
    staleTime: 5000,
  });

  const atualizarStatusPedido = useCallback(
    async (id: string, status: OrderStatus) => {
      const response = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Falha ao atualizar status' }));
        throw new Error(errorData.error || 'Falha ao atualizar status do pedido');
      }

      queryClient.invalidateQueries({ queryKey: ['kds-pedidos', restauranteId] });
    },
    [queryClient, restauranteId]
  );

  // Handle new orders via Socket.io and play sound
  useEffect(() => {
    const handleNewOrder = (payload: { id: string }) => {
      if (somAtivado && !soundPlayedRef.current.has(payload.id)) {
        soundPlayedRef.current.add(payload.id);
        tocarSomNovoPedido();
      }
      queryClient.invalidateQueries({ queryKey: ['kds-pedidos', restauranteId] });
    };

    if (socketConnected) {
      on('newOrder', handleNewOrder as (...args: unknown[]) => void);
    }

    return () => {
      off('newOrder', handleNewOrder as (...args: unknown[]) => void);
    };
  }, [socketConnected, restauranteId, queryClient, somAtivado, on, off]);

  // Set up polling fallback for order updates
  useEffect(() => {
    if (!enabled || !restauranteId) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      /* eslint-disable react-hooks/set-state-in-effect */
      setIsConnected(false);
      return;
    }

    setError(null);

    // Use socket if connected, otherwise fall back to polling
    if (socketConnected) {
      setIsConnected(true);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } else {
      setIsConnected(false);

      const startPolling = () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        pollingRef.current = setInterval(() => {
          // Check for new orders to play sound
          const currentOrderIds = new Set((data || []).map((o) => o.id).filter(Boolean));

          // Detect new orders
          currentOrderIds.forEach((orderId) => {
            if (!previousOrderIdsRef.current.has(orderId) && somAtivado) {
              if (!soundPlayedRef.current.has(orderId)) {
                soundPlayedRef.current.add(orderId);
                tocarSomNovoPedido();
              }
            }
          });

          previousOrderIdsRef.current = currentOrderIds;

          // Refetch data
          queryClient.invalidateQueries({ queryKey: ['kds-pedidos', restauranteId] });
        }, POLLING_INTERVAL);
      };

      startPolling();
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [enabled, restauranteId, queryClient, somAtivado, data, socketConnected]);

  const pedidosProcessados = useMemo<PedidoKDS[]>(() => {
    return (data || []).map((pedido) => {
      const age_seconds = getOrderAge(pedido);
      return {
        ...pedido,
        age_seconds,
        age_display: getOrderAgeDisplay(age_seconds),
        is_stale: isOrderStale(pedido, staleThresholdSeconds),
      };
    });
  }, [data, staleThresholdSeconds]);

  const pedidosOrdenados = useMemo(() => {
    return [...pedidosProcessados].sort((a, b) => b.age_seconds - a.age_seconds);
  }, [pedidosProcessados]);

  const pedidosRecebidos = useMemo(
    () => pedidosOrdenados.filter((p) => p.status === 'paid'),
    [pedidosOrdenados]
  );

  const pedidosPreparando = useMemo(
    () => pedidosOrdenados.filter((p) => p.status === 'preparing'),
    [pedidosOrdenados]
  );

  const pedidosProntos = useMemo(
    () => pedidosOrdenados.filter((p) => p.status === 'ready'),
    [pedidosOrdenados]
  );

  return {
    pedidos: pedidosOrdenados,
    pedidosRecebidos,
    pedidosPreparando,
    pedidosProntos,
    isLoading,
    error,
    isConnected,
    refetch,
    atualizarStatusPedido,
  };
}
