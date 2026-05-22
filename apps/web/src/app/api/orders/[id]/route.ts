import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 });
    }

    // Fetch order
    const orderResult = await sql<{
      id: string;
      restaurant_id: string;
      status: string;
      payment_status: string;
      created_at: string;
    }>`
      SELECT id, restaurant_id, status, payment_status, created_at
      FROM orders
      WHERE id = ${id} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!orderResult || orderResult.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderResult[0];

    // Fetch order items
    const itemsResult = await sql<OrderItemResponse>`
      SELECT id, order_id, product_id, combo_id, quantity, unit_price, total_price, notes
      FROM order_items
      WHERE order_id = ${id}
    `;

    // Fetch status history
    const historyResult = await sql<{
      id: string;
      status: string;
      notes: string | null;
      created_at: string;
    }>`
      SELECT id, status, notes, created_at
      FROM order_status_history
      WHERE order_id = ${id}
      ORDER BY created_at ASC
    `;

    const response: OrderResponse = {
      id: order.id,
      status: order.status as OrderStatus,
      payment_status: order.payment_status as PaymentStatus,
      items: itemsResult.map((item: OrderItemResponse) => ({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        combo_id: item.combo_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes,
      })),
      status_history: historyResult.map((entry: { id: string; status: string; notes: string | null; created_at: string }) => ({
        id: entry.id,
        status: entry.status as OrderStatus,
        notes: entry.notes,
        created_at: entry.created_at,
      })),
      created_at: order.created_at,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
