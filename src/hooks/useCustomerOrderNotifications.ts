/**
 * useCustomerOrderNotifications Hook
 * Escuta atualizações de status de pedidos via Supabase Realtime broadcast
 * para notificar o cliente quando o status do pedido mudar.
 *
 * O admin envia broadcasts pelo canal 'orders' quando atualiza o status.
 * Este hook se inscreve nesse canal e notifica o cliente.
 */

import { useEffect, useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

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

/**
 * Hook para monitorar atualizações de status de pedidos em tempo real.
 *
 * @example
 * const { pendingUpdates, clearPendingUpdates } = useCustomerOrderNotifications({
 *   orderIds: ['order-id-1', 'order-id-2'],
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
}: UseCustomerOrderNotificationsOptions): UseCustomerOrderNotificationsResult {
  const [pendingUpdates, setPendingUpdates] = useState<OrderUpdatePayload[]>([]);

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

  useEffect(() => {
    if (!enabled || orderIds.length === 0) {
      return;
    }

    // Limpa atualizações pendentes quando orderIds mudou
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingUpdates([]);

    const supabase = createClient();

    const channel = supabase.channel('orders').on(
      'broadcast',
      { event: 'order_updated' },
      (payload) => {
        const data = payload.payload as OrderUpdatePayload;
        handleOrderUpdated(data);
      }
    ).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, orderIds.join(','), handleOrderUpdated]);

  return {
    pendingUpdates,
    clearPendingUpdates,
  };
}
