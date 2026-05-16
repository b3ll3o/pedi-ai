/**
 * usePedidosKDS Hook
 * Hook para Kitchen Display System (KDS) - lista pedidos e atualiza em tempo real.
 */

import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { OrderWithItems, OrderStatus } from '@/application/services/adminOrderService';
import {
  getOrderAge,
  getOrderAgeDisplay,
  isOrderStale,
} from '@/application/services/adminOrderService';

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

  useEffect(() => {
    if (!enabled || !restauranteId) {
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel('kds-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restauranteId}`,
        },
        (payload) => {
          const newOrder = payload.new as OrderWithItems;
          if (KDS_STATUSES.includes(newOrder.status as OrderStatus)) {
            queryClient.invalidateQueries({ queryKey: ['kds-pedidos', restauranteId] });
            if (somAtivado && !soundPlayedRef.current.has(newOrder.id)) {
              soundPlayedRef.current.add(newOrder.id);
              tocarSomNovoPedido();
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restauranteId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['kds-pedidos', restauranteId] });
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setError(new Error('Conexão Realtime perdida'));
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, restauranteId, queryClient, somAtivado]);

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
