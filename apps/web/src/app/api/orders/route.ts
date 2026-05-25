import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
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
  customer_email?: string;
  restaurant_id?: string;
  items: OrderItemInput[];
  payment_method?: 'pix' | 'card';
  idempotency_key: string;
}

const TAX_RATE = 0.1; // 10% tax

function validateOrderRequest(body: CreateOrderRequest): string | null {
  if (!body.customer_id || !body.items || body.items.length === 0) {
    return 'customer_id and items are required';
  }

  if (!body.idempotency_key) {
    return 'idempotency_key is required';
  }

  if (body.payment_method !== undefined && !['pix', 'card'].includes(body.payment_method)) {
    return 'Invalid payment_method. Must be pix or card';
  }

  return null;
}

function calculateTotals(items: OrderItemInput[]): {
  subtotal: number;
  tax: number;
  total: number;
} {
  let subtotal = 0;
  for (const item of items) {
    const itemSubtotal = item.unit_price * item.quantity;
    const modifiersTotal =
      (item.modifiers || []).reduce((sum, m) => sum + m.price, 0) * item.quantity;
    subtotal += itemSubtotal + modifiersTotal;
  }

  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return { subtotal, tax, total };
}

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

    const result = await apiClient.get<ApiResponse<unknown[]>>(
      `/orders/customer?customerId=${customerId}&restaurantId=${restaurantId}`
    );

    return NextResponse.json(result.data || []);
  } catch (error) {
    console.error('Unexpected error in GET /api/orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();

    // Validate required fields
    const validationError = validateOrderRequest(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Calculate totals
    const { subtotal, tax, total } = calculateTotals(body.items);

    // Transform to API format
    const apiOrderData = {
      restaurantId: body.restaurant_id || '',
      tableId: body.table_id,
      customerId: body.customer_id,
      customerPhone: body.customer_phone,
      customerName: body.customer_name,
      customerEmail: body.customer_email,
      subtotal,
      tax,
      total,
      paymentMethod: body.payment_method,
      idempotencyKey: body.idempotency_key,
      items: body.items.map((item) => ({
        productId: item.product_id,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.unit_price * item.quantity,
        notes: item.notes,
      })),
    };

    const result = await apiClient.post<
      ApiResponse<{
        id: string;
        status: string;
        total: number;
        createdAt: string;
      }>
    >('/orders', apiOrderData);

    const order = result.data;

    return NextResponse.json({
      id: order.id,
      status: order.status,
      total: order.total,
      created_at: order.createdAt,
    });
  } catch (error) {
    console.error('Unexpected error in /api/orders:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
