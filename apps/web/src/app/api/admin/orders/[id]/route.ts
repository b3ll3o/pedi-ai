import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: orderId } = await params;

    // Get order
    const orderResult = await sql`
      SELECT o.*, t.name as table_name, r.name as restaurant_name
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      LEFT JOIN restaurants r ON o.restaurant_id = r.id
      WHERE o.id = ${orderId}
      LIMIT 1
    `;

    if (!orderResult[0]) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${userId} AND restaurant_id = ${orderResult[0].restaurant_id}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Get order items
    const itemsResult = await sql`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ${orderId}
    `;

    // Get order status history
    const historyResult = await sql`
      SELECT * FROM order_status_history
      WHERE order_id = ${orderId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      order: {
        ...orderResult[0],
        items: itemsResult,
        history: historyResult,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/orders/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
