import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';

// GET /api/orders - Fetch orders for a customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customer_id');
    const restaurantId = searchParams.get('restaurant_id');

    if (!customerId || !restaurantId) {
      return NextResponse.json(
        { error: 'customer_id and restaurant_id are required' },
        { status: 400 }
      );
    }

    const result = await sql<{
      id: string;
      status: string;
      total: number;
      created_at: string;
      payment_status: string;
    }>`
      SELECT id, status, total, created_at, payment_status
      FROM orders
      WHERE customer_id = ${customerId} AND restaurant_id = ${restaurantId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Unexpected error in GET /api/orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface OrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  modifiers?: { name: string; price: number }[];
  notes?: string;
}

interface CreateOrderRequest {
  table_id: string | null;
  customer_id: string;
  customer_phone?: string;
  customer_name?: string;
  restaurant_id?: string;
  items: OrderItemInput[];
  payment_method?: 'pix' | 'card';
  idempotency_key: string;
}

const TAX_RATE = 0.1; // 10% tax

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();

    // Validate required fields
    if (!body.customer_id || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'customer_id and items are required' }, { status: 400 });
    }

    if (!body.idempotency_key) {
      return NextResponse.json({ error: 'idempotency_key is required' }, { status: 400 });
    }

    if (body.payment_method !== undefined && !['pix', 'card'].includes(body.payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment_method. Must be pix or card' },
        { status: 400 }
      );
    }

    // Check idempotency
    const existingOrder = await sql<{ id: string; status: string; total: number; created_at: string }>`
      SELECT id, status, total, created_at
      FROM orders
      WHERE customer_id = ${body.customer_id} AND idempotency_key = ${body.idempotency_key}
      LIMIT 1
    `;

    if (existingOrder.length > 0) {
      const order = existingOrder[0];
      return NextResponse.json({
        id: order.id,
        status: order.status,
        total: order.total,
        created_at: order.created_at,
      });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of body.items) {
      const itemSubtotal = item.unit_price * item.quantity;
      const modifiersTotal =
        (item.modifiers || []).reduce((sum, m) => sum + m.price, 0) * item.quantity;
      subtotal += itemSubtotal + modifiersTotal;
    }

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    // Determine restaurant_id: from table > from body > first restaurant (fallback)
    let restaurantId: string | null = null;

    if (body.table_id) {
      const tableResult = await sql<{ restaurant_id: string }>`
        SELECT restaurant_id
        FROM tables
        WHERE id = ${body.table_id}
        LIMIT 1
      `;

      if (tableResult.length === 0) {
        return NextResponse.json({ error: 'Invalid table_id' }, { status: 400 });
      }

      restaurantId = tableResult[0].restaurant_id;
    }

    if (!restaurantId && body.restaurant_id) {
      restaurantId = body.restaurant_id;
    }

    if (!restaurantId) {
      const restaurantResult = await sql<{ id: string }>`
        SELECT id FROM restaurants LIMIT 1
      `;

      if (restaurantResult.length === 0) {
        return NextResponse.json({ error: 'No restaurant found' }, { status: 400 });
      }

      restaurantId = restaurantResult[0].id;
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();

    // Insert order
    await sql`
      INSERT INTO orders (
        id, restaurant_id, table_id, customer_id, customer_phone, customer_name,
        status, subtotal, tax, total, payment_method, payment_status, idempotency_key,
        created_at, updated_at
      ) VALUES (
        ${orderId}, ${restaurantId}, ${body.table_id || null}, ${body.customer_id},
        ${body.customer_phone || null}, ${body.customer_name || null},
        'pending_payment', ${subtotal}, ${tax}, ${total}, null, 'pending',
        ${body.idempotency_key}, ${now}, ${now}
      )
    `;

    // Insert order items
    for (const item of body.items) {
      const itemId = crypto.randomUUID();
      await sql`
        INSERT INTO order_items (
          id, order_id, product_id, combo_id, quantity, unit_price, total_price, notes, created_at
        ) VALUES (
          ${itemId}, ${orderId}, ${item.product_id}, null, ${item.quantity},
          ${item.unit_price}, ${item.unit_price * item.quantity}, ${item.notes || null}, ${now}
        )
      `;
    }

    return NextResponse.json({
      id: orderId,
      status: 'received',
      total,
      created_at: now,
    });
  } catch (error) {
    console.error('Unexpected error in /api/orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
