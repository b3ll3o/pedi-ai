import { NextRequest, NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import { getSession } from '@/lib/auth/session';

async function verifyRestaurantAccess(userId: string, restaurantId: string): Promise<boolean> {
  const profileResult = await sql`
    SELECT role FROM users_profiles
    WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}
    LIMIT 1
  `;
  return profileResult.length > 0;
}

async function fetchAnalyticsTotals(restaurantId: string) {
  return sql`
    SELECT
      COUNT(*) as total_orders,
      COALESCE(SUM(total_cents), 0) as total_revenue
    FROM orders o
    WHERE o.restaurant_id = ${restaurantId}
      AND o.status NOT IN ('canceled')
  `;
}

async function fetchOrdersByStatus(restaurantId: string) {
  return sql`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE restaurant_id = ${restaurantId}
    GROUP BY status
  `;
}

async function fetchAverageOrderValue(restaurantId: string) {
  return sql`
    SELECT COALESCE(AVG(total_cents), 0) as avg_order_value
    FROM orders
    WHERE restaurant_id = ${restaurantId}
      AND status NOT IN ('canceled')
  `;
}

async function fetchDailyOrders(restaurantId: string) {
  return sql`
    SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_cents) as revenue
    FROM orders
    WHERE restaurant_id = ${restaurantId}
      AND status NOT IN ('canceled')
      AND created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const hasAccess = await verifyRestaurantAccess(session.user.id, restaurantId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado a este restaurante' }, { status: 403 });
    }

    const [totalsResult, statusResult, avgResult, dailyResult] = await Promise.all([
      fetchAnalyticsTotals(restaurantId),
      fetchOrdersByStatus(restaurantId),
      fetchAverageOrderValue(restaurantId),
      fetchDailyOrders(restaurantId),
    ]);

    return NextResponse.json({
      analytics: {
        total_orders: totalsResult[0]?.total_orders || 0,
        total_revenue: totalsResult[0]?.total_revenue || 0,
        avg_order_value: avgResult[0]?.avg_order_value || 0,
        orders_by_status: statusResult,
        daily_orders: dailyResult,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/analytics:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
