import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ['paid', 'preparing', 'cancelled'],
  paid: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

type _OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

// GET /api/orders/[id]/status - Get order status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const result = await sql<{
      id: string;
      status: string;
      payment_status: string;
      updated_at: string;
    }>`
      SELECT id, status, payment_status, updated_at
      FROM orders
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = result[0];
    return NextResponse.json({
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      updated_at: order.updated_at,
    });
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/orders/[id]/status - Update order status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    // Fetch current order
    const currentResult = await sql<{
      id: string;
      status: string;
      payment_status: string;
    }>`
      SELECT id, status, payment_status
      FROM orders
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!currentResult || currentResult.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const currentOrder = currentResult[0];
    const currentStatus = currentOrder.status as string;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status transition from '${currentOrder.status}' to '${status}'`,
          current_status: currentOrder.status,
          allowed_transitions: allowedTransitions,
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Update order status
    await sql`
      UPDATE orders
      SET status = ${status}, updated_at = ${now}
      WHERE id = ${id}
    `;

    // Record status change in history
    await sql`
      INSERT INTO order_status_history (id, order_id, status, notes, created_at)
      VALUES (${crypto.randomUUID()}, ${id}, ${status}, ${notes || null}, ${now})
    `;

    // Fetch updated order
    const updatedResult = await sql<{
      id: string;
      status: string;
      payment_status: string;
      updated_at: string;
    }>`
      SELECT id, status, payment_status, updated_at
      FROM orders
      WHERE id = ${id}
      LIMIT 1
    `;

    const updatedOrder = updatedResult[0];

    return NextResponse.json({
      id: updatedOrder.id,
      status: updatedOrder.status,
      payment_status: updatedOrder.payment_status,
      updated_at: updatedOrder.updated_at,
    });
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
