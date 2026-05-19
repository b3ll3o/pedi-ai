import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    const { id: orderId } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: 'status é obrigatório' }, { status: 400 });
    }

    // Get order
    const orderResult = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`;

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

    const now = new Date().toISOString();

    // Update order status
    await sql`
      UPDATE orders SET status = ${status}, updated_at = ${now}
      WHERE id = ${orderId}
    `;

    // Add status history entry
    await sql`
      INSERT INTO order_status_history (id, order_id, status, notes, created_at)
      VALUES (${crypto.randomUUID()}, ${orderId}, ${status}, ${notes || null}, ${now})
    `;

    // Fetch updated order with history
    const updatedOrder = await sql`SELECT * FROM orders WHERE id = ${orderId} LIMIT 1`;
    const historyResult = await sql`
      SELECT * FROM order_status_history
      WHERE order_id = ${orderId}
      ORDER BY created_at ASC
    `;

    return NextResponse.json({
      order: { ...updatedOrder[0], history: historyResult },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/orders/[id]/status:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
