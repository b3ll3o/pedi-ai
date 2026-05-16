import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { orders } from '@/infrastructure/database/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin';

type Period = 'day' | 'week' | 'month';

// GET /api/admin/analytics/orders - Get orders grouped by period with revenue
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const restaurantId = getRestaurantId(authUser);
    const { searchParams } = new URL(request.url);

    const period = (searchParams.get('period') || 'day') as Period;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Validate period
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        { error: 'Período inválido. Use: day, week ou month' },
        { status: 400 }
      );
    }

    // Default date range: last 30 days
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const defaultEndDate = new Date();

    const from = startDate || defaultStartDate.toISOString().split('T')[0];
    const to = endDate || defaultEndDate.toISOString().split('T')[0];

    if (isDevDatabase()) {
      // Query orders using Drizzle
      const ordersResult = await db
        .select({
          created_at: orders.created_at,
          total: orders.total,
          payment_status: orders.payment_status,
        })
        .from(orders)
        .where(
          and(
            eq(orders.restaurant_id, restaurantId),
            gte(orders.created_at, from),
            lte(orders.created_at, to + 'T23:59:59.999Z')
          )
        )
        .all();

      // Group orders by period
      const ordersByPeriod: Record<string, { count: number; revenue: number }> = {};

      ordersResult.forEach((order) => {
        const createdAt = order.created_at;
        if (!createdAt) return;

        const date = new Date(createdAt);
        let periodKey: string;

        switch (period) {
          case 'week': {
            // Get start of week (Monday)
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            const weekStart = new Date(date);
            weekStart.setDate(diff);
            periodKey = weekStart.toISOString().split('T')[0];
            break;
          }
          case 'month':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            periodKey = createdAt.split('T')[0];
        }

        if (!ordersByPeriod[periodKey]) {
          ordersByPeriod[periodKey] = { count: 0, revenue: 0 };
        }

        ordersByPeriod[periodKey].count++;

        // Only count paid orders in revenue
        if (order.payment_status === 'paid' && typeof order.total === 'number') {
          ordersByPeriod[periodKey].revenue += order.total;
        }
      });

      // Convert to array format
      const ordersArray = Object.entries(ordersByPeriod)
        .map(([date, data]) => ({
          date,
          count: data.count,
          revenue: Math.round(data.revenue * 100) / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate totals
      const totalOrders = ordersArray.reduce((sum, o) => sum + o.count, 0);
      const totalRevenue = ordersArray.reduce((sum, o) => sum + o.revenue, 0);

      return NextResponse.json({
        orders: ordersArray,
        total: {
          count: totalOrders,
          revenue: Math.round(totalRevenue * 100) / 100,
        },
        period,
        date_range: {
          start_date: from,
          end_date: to,
        },
      });
    } else {
      const supabase = getSupabaseAdmin();

      // Query orders using Supabase
      const { data: ordersResult, error: ordersError } = await supabase
        .from('orders')
        .select('created_at, total, payment_status')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59.999Z');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
      }

      // Group orders by period
      const ordersByPeriod: Record<string, { count: number; revenue: number }> = {};

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((ordersResult as any[]) || []).forEach(
        (order: { created_at?: string; total?: number; payment_status?: string }) => {
          const createdAt = order.created_at;
          if (!createdAt) return;

          const date = new Date(createdAt);
          let periodKey: string;

          switch (period) {
            case 'week': {
              // Get start of week (Monday)
              const day = date.getDay();
              const diff = date.getDate() - day + (day === 0 ? -6 : 1);
              const weekStart = new Date(date);
              weekStart.setDate(diff);
              periodKey = weekStart.toISOString().split('T')[0];
              break;
            }
            case 'month':
              periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              break;
            default:
              periodKey = createdAt.split('T')[0];
          }

          if (!ordersByPeriod[periodKey]) {
            ordersByPeriod[periodKey] = { count: 0, revenue: 0 };
          }

          ordersByPeriod[periodKey].count++;

          // Only count paid orders in revenue
          if (order.payment_status === 'paid' && typeof order.total === 'number') {
            ordersByPeriod[periodKey].revenue += order.total;
          }
        }
      );

      // Convert to array format
      const ordersArray = Object.entries(ordersByPeriod)
        .map(([date, data]) => ({
          date,
          count: data.count,
          revenue: Math.round(data.revenue * 100) / 100,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate totals
      const totalOrders = ordersArray.reduce((sum, o) => sum + o.count, 0);
      const totalRevenue = ordersArray.reduce((sum, o) => sum + o.revenue, 0);

      return NextResponse.json({
        orders: ordersArray,
        total: {
          count: totalOrders,
          revenue: Math.round(totalRevenue * 100) / 100,
        },
        period,
        date_range: {
          start_date: from,
          end_date: to,
        },
      });
    }
  } catch (error) {
    console.error('Unexpected error in /api/admin/analytics/orders:', error);
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status });
  }
}
