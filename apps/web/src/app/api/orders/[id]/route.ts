import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

interface OrderItemResponse {
  id: string;
  order_id: string;
  product_id: string;
  combo_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
}

interface StatusHistoryEntry {
  id: string;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
}

interface OrderResponse {
  id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  items: OrderItemResponse[];
  status_history: StatusHistoryEntry[];
  created_at: string;
}

interface ApiOrderData {
  id: string;
  status: string;
  paymentStatus: string;
  items: Array<{
    id: string;
    productId: string;
    comboId: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes: string | null;
  }>;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<ApiOrderData>>(`/orders/${id}`);

    const order = result.data;

    // Transform API response to web format
    const response: OrderResponse = {
      id: order.id,
      status: order.status as OrderStatus,
      payment_status: order.paymentStatus as PaymentStatus,
      items: order.items.map((item) => ({
        id: item.id,
        order_id: id,
        product_id: item.productId,
        combo_id: item.comboId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        notes: item.notes,
      })),
      status_history: [],
      created_at: order.createdAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
