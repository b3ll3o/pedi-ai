/**
 * Admin Order Service
 * Handles order management operations for admin/kitchen/waiter.
 */

import type { orders, order_items, order_status_history } from '@/lib/supabase/types';

export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface OrderFilters {
  restaurant_id: string;
  status?: OrderStatus | OrderStatus[];
  payment_status?: PaymentStatus | PaymentStatus[];
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface OrderWithItems extends orders {
  items: order_items[];
  status_history?: order_status_history[];
  table?: { id: string; number: number; name: string | null } | null;
  customer?: { id: string; name: string; email: string } | null;
}

// ── Fetch Orders ─────────────────────────────────────────────

export async function getOrders(filters: OrderFilters): Promise<{
  orders: OrderWithItems[];
  total: number;
  limit: number;
  offset: number;
}> {
  const params = new URLSearchParams();
  params.append('restaurant_id', filters.restaurant_id);

  if (filters.status) {
    params.append(
      'status',
      Array.isArray(filters.status) ? filters.status.join(',') : filters.status
    );
  }

  if (filters.payment_status) {
    params.append(
      'payment_status',
      Array.isArray(filters.payment_status)
        ? filters.payment_status.join(',')
        : filters.payment_status
    );
  }

  if (filters.date_from) {
    params.append('date_from', filters.date_from);
  }

  if (filters.date_to) {
    params.append('date_to', filters.date_to);
  }

  if (filters.limit !== undefined) {
    params.append('limit', filters.limit.toString());
  }

  if (filters.offset !== undefined) {
    params.append('offset', filters.offset.toString());
  }

  const response = await fetch(`/api/admin/orders?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch orders' }));
    throw new Error(error.error || 'Failed to fetch orders');
  }

  return response.json();
}

export async function getOrder(orderId: string): Promise<OrderWithItems> {
  const response = await fetch(`/api/admin/orders/${orderId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch order' }));
    throw new Error(error.error || 'Failed to fetch order');
  }

  const { order } = await response.json();
  return order as OrderWithItems;
}

// ── Update Order Status ──────────────────────────────────────

export async function getOrderStatus(orderId: string): Promise<{
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  updated_at: string;
}> {
  const response = await fetch(`/api/orders/${orderId}/status`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch order status' }));
    throw new Error(error.error || 'Failed to fetch order status');
  }

  return response.json();
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  notes?: string
): Promise<{
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  updated_at: string;
}> {
  const response = await fetch(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, notes }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update order status' }));
    throw new Error(error.error || 'Failed to update order status');
  }

  return response.json();
}

// ── Status Transition Validation ─────────────────────────────

// Valid transitions map
export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function isValidStatusTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus
): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowed?.includes(newStatus) ?? false;
}

export function getAllowedTransitions(currentStatus: OrderStatus): OrderStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

// ── Kitchen Display Helpers ──────────────────────────────────

export function getOrderAge(order: OrderWithItems): number {
  const createdAt = new Date(order.created_at).getTime();
  const now = Date.now();
  return Math.floor((now - createdAt) / 1000); // seconds
}

export function getOrderAgeDisplay(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function isOrderStale(order: OrderWithItems, thresholdSeconds: number = 300): boolean {
  return getOrderAge(order) > thresholdSeconds;
}
