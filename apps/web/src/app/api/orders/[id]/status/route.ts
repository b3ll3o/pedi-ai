import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { orders, orderStatusHistory } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';

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

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

// GET /api/orders/[id]/status - Get order status
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (isDevDatabase()) {
      const result = await db
        .select({
          id: orders.id,
          status: orders.status,
          payment_status: orders.payment_status,
          updated_at: orders.updated_at,
        })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

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
    } else {
      const supabaseAdmin = getSupabaseAdmin();

      const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching order:', error);
        return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
      }

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      return NextResponse.json({
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        updated_at: order.updated_at,
      });
    }
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

    if (isDevDatabase()) {
      // Fetch current order
      const currentResult = await db
        .select({ id: orders.id, status: orders.status, payment_status: orders.payment_status })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

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
      await db
        .update(orders)
        .set({ status: status as OrderStatus, updated_at: now })
        .where(eq(orders.id, id));

      // Record status change in history
      await db.insert(orderStatusHistory).values({
        id: crypto.randomUUID(),
        order_id: id,
        status: status as OrderStatus,
        notes: notes || null,
        created_at: now,
      });

      // Fetch updated order
      const updatedResult = await db
        .select({
          id: orders.id,
          status: orders.status,
          payment_status: orders.payment_status,
          updated_at: orders.updated_at,
        })
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      const updatedOrder = updatedResult[0];

      return NextResponse.json({
        id: updatedOrder.id,
        status: updatedOrder.status,
        payment_status: updatedOrder.payment_status,
        updated_at: updatedOrder.updated_at,
      });
    } else {
      const supabaseAdmin = getSupabaseAdmin();

      // Fetch current order
      const { data: currentOrder, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('id, status, payment_status')
        .eq('id', id)
        .single();

      if (fetchError || !currentOrder) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      // Validate status transition
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

      // If cancelling, handle payment refund if applicable
      if (status === 'cancelled' && currentOrder.payment_status === 'paid') {
        // Payment refund logic would go here
        // For now, we'll just update the payment status
      }

      // Update order status
      const { data: order, error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating order status:', updateError);
        return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
      }

      // Record status change in history
      await supabaseAdmin.from('order_status_history').insert({
        order_id: id,
        status,
        notes: notes || null,
      });

      return NextResponse.json({
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        updated_at: order.updated_at,
      });
    }
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]/status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
