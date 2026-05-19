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
    const _startDate = request.nextUrl.searchParams.get('start_date');
    const _endDate = request.nextUrl.searchParams.get('end_date');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10);

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

    // Get popular items based on order items
    const popularItemsResult = await sql`
      SELECT
        oi.product_id,
        p.name as product_name,
        COUNT(*) as order_count,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.quantity * oi.unit_price_cents) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE o.restaurant_id = ${restaurantId}
        AND o.status NOT IN ('canceled')
        AND o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY oi.product_id, p.name
      ORDER BY total_quantity DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ popular_items: popularItemsResult });
  } catch (error) {
    console.error('Error in GET /api/admin/analytics/popular-items:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
