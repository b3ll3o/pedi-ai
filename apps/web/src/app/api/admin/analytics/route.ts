import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/infrastructure/database/pg-client';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabaseAuth() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server component - ignore
          }
        },
      },
    }
  );
}

export async function GET(request: NextRequest) {
  try {
    const supabaseAuth = await getSupabaseAuth();
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');
    const startDate = request.nextUrl.searchParams.get('start_date');
    const endDate = request.nextUrl.searchParams.get('end_date');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    // Verify user has access to this restaurant
    const profileResult = await sql`
      SELECT role FROM users_profiles
      WHERE user_id = ${user.id} AND restaurant_id = ${restaurantId}
      LIMIT 1
    `;

    if (!profileResult[0]) {
      return NextResponse.json({ error: 'Acesso negado a este restaurante' }, { status: 403 });
    }

    // Build date filter
    let dateFilter = '';
    const params: unknown[] = [restaurantId];

    if (startDate && endDate) {
      dateFilter = ` AND o.created_at >= $2 AND o.created_at <= $3`;
      params.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = ` AND o.created_at >= $2`;
      params.push(startDate);
    } else if (endDate) {
      dateFilter = ` AND o.created_at <= $2`;
      params.push(endDate);
    }

    // Get total orders
    const ordersResult = await sql`
      SELECT COUNT(*) as total_orders,
             COALESCE(SUM(total_cents), 0) as total_revenue
      FROM orders o
      WHERE o.restaurant_id = ${restaurantId}
        AND o.status NOT IN ('canceled')
        ${dateFilter ? sql`AND o.created_at >= ${startDate} AND o.created_at <= ${endDate}` : sql``}
    `;

    // Get orders by status
    const statusResult = await sql`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE restaurant_id = ${restaurantId}
      GROUP BY status
    `;

    // Get average order value
    const avgResult = await sql`
      SELECT COALESCE(AVG(total_cents), 0) as avg_order_value
      FROM orders
      WHERE restaurant_id = ${restaurantId}
        AND status NOT IN ('canceled')
    `;

    // Get daily orders for the period
    const dailyResult = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as orders, SUM(total_cents) as revenue
      FROM orders
      WHERE restaurant_id = ${restaurantId}
        AND status NOT IN ('canceled')
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return NextResponse.json({
      analytics: {
        total_orders: ordersResult[0]?.total_orders || 0,
        total_revenue: ordersResult[0]?.total_revenue || 0,
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
