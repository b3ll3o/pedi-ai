import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');
    const status = request.nextUrl.searchParams.get('status');
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1', 10);
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20', 10);

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado a este restaurante' }, { status: 403 });
    }

    const offset = (page - 1) * limit;

    // Build query based on filters
    let ordersResult;
    let totalResult;

    if (status) {
      ordersResult = await sql`
        SELECT o.*, t.name as table_name
        FROM orders o
        LEFT JOIN tables t ON o.table_id = t.id
        WHERE o.restaurant_id = ${restaurantId} AND o.status = ${status}
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      totalResult = await sql`
        SELECT COUNT(*) as total FROM orders
        WHERE restaurant_id = ${restaurantId} AND status = ${status}
      `;
    } else {
      ordersResult = await sql`
        SELECT o.*, t.name as table_name
        FROM orders o
        LEFT JOIN tables t ON o.table_id = t.id
        WHERE o.restaurant_id = ${restaurantId}
        ORDER BY o.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      totalResult = await sql`
        SELECT COUNT(*) as total FROM orders WHERE restaurant_id = ${restaurantId}
      `;
    }

    const total = totalResult[0]?.total || 0;

    // Get order items for each order
    const orderIds = ordersResult.map((o: { id: string }) => o.id);
    let orderItems: Record<string, unknown>[] = [];

    if (orderIds.length > 0) {
      orderItems = await sql`
        SELECT oi.*, p.name as product_name
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ANY(${orderIds})
      `;
    }

    // Group items by order_id
    const itemsByOrderId = orderItems.reduce<
      Record<string, { order_id: string; product_name?: string }[]>
    >(
      (acc, curr) => {
        const orderId = curr.order_id as string;
        const item = curr as { order_id: string; product_name?: string };
        if (!acc[orderId]) {
          acc[orderId] = [];
        }
        acc[orderId].push(item);
        return acc;
      },
      {} as Record<string, { order_id: string; product_name?: string }[]>
    );

    // Attach items to orders
    const ordersWithItems = ordersResult.map((o: Record<string, unknown>) => ({
      ...o,
      items: itemsByOrderId[o.id as string] || [],
    }));

    return NextResponse.json({
      orders: ordersWithItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/orders:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
