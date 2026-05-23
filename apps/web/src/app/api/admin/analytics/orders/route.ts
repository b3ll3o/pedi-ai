import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const userId = session.user.id;

    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');
    const startDate = request.nextUrl.searchParams.get('start_date');
    const endDate = request.nextUrl.searchParams.get('end_date');

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

    // Get orders count by status for the period
    const ordersResult = await sql`
      SELECT
        status,
        COUNT(*) as count,
        SUM(total_cents) as revenue
      FROM orders
      WHERE restaurant_id = ${restaurantId}
        AND created_at >= ${startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()}
        AND created_at <= ${endDate || new Date().toISOString()}
      GROUP BY status
    `;

    return NextResponse.json({ orders: ordersResult });
  } catch (error) {
    console.error('Error in GET /api/admin/analytics/orders:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
