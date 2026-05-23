/**
 * useCustomerOrderNotifications Hook
 * Monitora atualizações de status de pedidos via Socket.io com polling fallback.
 * Supabase realtime broadcast removido.
 */

import { useEffect, useCallback, useState, useMemo, useRef } from 'react';

import { useSocketIO } from './useSocketIO';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export interface OrderUpdatePayload {
  order_id: string;
  status: OrderStatus;
  updated_at: string;
  updated_by: string;
}

export interface UseCustomerOrderNotificationsOptions {
  /** IDs dos pedidos que o cliente deseja monitorar */
  orderIds: string[];
  /** Callback chamado quando o status de um pedido é atualizado */
  onOrderUpdated?: (payload: OrderUpdatePayload) => void;
  /** Se falso, desabilita a inscrição */
  enabled?: boolean;
  /** ID do restaurante para conexão Socket.io */
  restaurantId?: string;
}

export interface UseCustomerOrderNotificationsResult {
  /** Quantidade de notificações não processadas */
  pendingUpdates: OrderUpdatePayload[];
  /** Limpa todas as notificações pendentes */
  clearPendingUpdates: () => void;
}

// Rótulos de status em português
const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: 'Aguardando pagamento',
  paid: 'Pago',
  preparing: 'Preparando',
  ready: 'Pronto',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

/**
 * Retorna o rótulo em português para um status de pedido.
 */
export function getStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

const POLLING_INTERVAL = 5000; // 5 seconds

/**
 * Hook para monitorar atualizações de status de pedidos em tempo real via Socket.io.
 *
 * @example
 * const { pendingUpdates, clearPendingUpdates } = useCustomerOrderNotifications({
 *   orderIds: ['order-id-1', 'order-id-2'],
 *   restaurantId: 'restaurant-123',
 *   onOrderUpdated: (payload) => {
 *     showToast(`Pedido ${payload.order_id}: status alterado para ${getStatusLabel(payload.status)}`);
 *   },
 *   enabled: true,
 * });
 */
export function useCustomerOrderNotifications({
  orderIds,
  onOrderUpdated,
  enabled = true,
  restaurantId,
}: UseCustomerOrderNotificationsOptions): UseCustomerOrderNotificationsResult {
  const [pendingUpdates, setPendingUpdates] = useState<OrderUpdatePayload[]>([]);
  const previousStatusesRef = useRef<Record<string, OrderStatus>>({});
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const orderIdsKey = useMemo(() => orderIds.join(','), [orderIds]);

  const {
    isConnected: socketConnected,
    on,
    off,
  } = useSocketIO({
    restaurantId,
    enabled,
  });

  const handleOrderUpdated = useCallback(
    (payload: OrderUpdatePayload) => {
      // Ignora se o pedido não for um dos que estamos monitorando
      if (orderIds.length > 0 && !orderIds.includes(payload.order_id)) {
        return;
      }

      // Armazena a atualização pendente via state (permite re-render)
      setPendingUpdates((prev) => [...prev, payload]);

      // Notifica via callback se registrado
      onOrderUpdated?.(payload);
    },
    [orderIds, onOrderUpdated]
  );

  const clearPendingUpdates = useCallback(() => {
    setPendingUpdates([]);
  }, []);

  // Handle order updates via Socket.io
  useEffect(() => {
    const handleOrderUpdate = (payload: { id: string; status: string }) => {
      const orderId = payload.id;
      const newStatus = payload.status as OrderStatus;

      if (orderIds.length > 0 && !orderIds.includes(orderId)) {
        return;
      }

      if (
        previousStatusesRef.current[orderId] !== undefined &&
        previousStatusesRef.current[orderId] !== newStatus
      ) {
        const updatePayload: OrderUpdatePayload = {
          order_id: orderId,
          status: newStatus,
          updated_at: new Date().toISOString(),
          updated_by: 'system',
        };
        handleOrderUpdated(updatePayload);
      }

      previousStatusesRef.current[orderId] = newStatus;
    };

    if (socketConnected) {
      on('orderUpdate', handleOrderUpdate as (...args: unknown[]) => void);
    }

    return () => {
      off('orderUpdate', handleOrderUpdate as (...args: unknown[]) => void);
    };
  }, [socketConnected, orderIds, handleOrderUpdated, on, off]);

  const fetchOrderStatus = useCallback(async (orderId: string): Promise<OrderStatus | null> => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return data.status as OrderStatus;
    } catch {
      return null;
    }
  }, []);

  const pollOrderStatuses = useCallback(async () => {
    if (!enabled || orderIds.length === 0) {
      return;
    }

    for (const orderId of orderIds) {
      const currentStatus = await fetchOrderStatus(orderId);

      if (currentStatus && previousStatusesRef.current[orderId] !== undefined) {
        if (previousStatusesRef.current[orderId] !== currentStatus) {
          // Status changed - notify
          const payload: OrderUpdatePayload = {
            order_id: orderId,
            status: currentStatus,
            updated_at: new Date().toISOString(),
            updated_by: 'system',
          };
          handleOrderUpdated(payload);
        }
      }

      // Update the stored status
      if (currentStatus) {
        previousStatusesRef.current[orderId] = currentStatus;
      }
    }
  }, [enabled, orderIds, fetchOrderStatus, handleOrderUpdated]);

  useEffect(() => {
    if (!enabled || !orderIdsKey) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // Limpa atualizações pendentes quando orderIds mudou
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingUpdates([]);

    // Reset previous statuses when orderIds change
    previousStatusesRef.current = {};

    // Use socket if connected, otherwise fall back to polling
    if (socketConnected) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    } else {
      // Start polling as fallback
      pollOrderStatuses();

      pollingRef.current = setInterval(pollOrderStatuses, POLLING_INTERVAL);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [enabled, orderIdsKey, socketConnected, pollOrderStatuses]);

  return {
    pendingUpdates,
    clearPendingUpdates,
  };
}
