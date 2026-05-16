import { NextRequest, NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { orders, orderItems, products } from '@/infrastructure/database/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin';

type Period = 'day' | 'week' | 'month';

// GET /api/admin/analytics/popular-items - Get most popular items
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    requireRole(authUser, ['dono', 'gerente']);

    const restaurantId = getRestaurantId(authUser);
    const { searchParams } = new URL(request.url);

    const period = (searchParams.get('period') || 'month') as Period;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Validate period
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        { error: 'Período inválido. Use: day, week ou month' },
        { status: 400 }
      );
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Limite deve ser entre 1 e 100' }, { status: 400 });
    }

    // Default date range: last 30 days
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 30);
    const defaultEndDate = new Date();

    const from = startDate || defaultStartDate.toISOString().split('T')[0];
    const to = endDate || defaultEndDate.toISOString().split('T')[0];

    if (isDevDatabase()) {
      // First, get all paid orders in the date range for this restaurant using Drizzle
      const ordersResult = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.restaurant_id, restaurantId),
            eq(orders.payment_status, 'paid'),
            gte(orders.created_at, from),
            lte(orders.created_at, to + 'T23:59:59.999Z')
          )
        );

      const orderIds = ordersResult.map((o) => o.id);

      if (orderIds.length === 0) {
        return NextResponse.json({
          items: [],
          period,
          date_range: {
            start_date: from,
            end_date: to,
          },
        });
      }

      // Get order items with product names
      const itemsResult = await db
        .select({
          product_id: orderItems.product_id,
          quantity: orderItems.quantity,
          product_name: products.name,
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.product_id, products.id))
        .where(inArray(orderItems.order_id, orderIds));

      // Aggregate by product
      const productQuantities: Record<string, number> = {};
      const productNames: Record<string, string> = {};

      itemsResult.forEach((item) => {
        if (!item.product_id || item.quantity == null) return;
        const productId = String(item.product_id);
        productQuantities[productId] = (productQuantities[productId] || 0) + item.quantity;
        if (item.product_name) {
          productNames[productId] = item.product_name;
        }
      });

      // Build final result
      const popularItems = Object.keys(productQuantities)
        .map((productId) => ({
          product_id: productId,
          product_name: productNames[productId] || 'Produto desconhecido',
          count: productQuantities[productId],
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return NextResponse.json({
        items: popularItems,
        period,
        date_range: {
          start_date: from,
          end_date: to,
        },
      });
    } else {
      const supabase = getSupabaseAdmin();

      // First, get all paid orders in the date range for this restaurant using Supabase
      const { data: ordersResult, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('payment_status', 'paid')
        .gte('created_at', from)
        .lte('created_at', to + 'T23:59:59.999Z');

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
      }

      const orderIds = ordersResult?.map((o) => o.id) || [];

      if (orderIds.length === 0) {
        return NextResponse.json({
          items: [],
          period,
          date_range: {
            start_date: from,
            end_date: to,
          },
        });
      }

      // Get order items with product names
      const { data: itemsResult, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, products(name)')
        .in('order_id', orderIds);

      if (itemsError) {
        console.error('Error fetching items:', itemsError);
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
      }

      // Aggregate by product
      const productQuantities: Record<string, number> = {};
      const productNames: Record<string, string> = {};

      itemsResult?.forEach((item) => {
        if (!item.product_id || item.quantity == null) return;
        const productId = String(item.product_id);
        productQuantities[productId] = (productQuantities[productId] || 0) + item.quantity;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((item as any).products?.name) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          productNames[productId] = (item as any).products.name;
        }
      });

      // Build final result
      const popularItems = Object.keys(productQuantities)
        .map((productId) => ({
          product_id: productId,
          product_name: productNames[productId] || 'Produto desconhecido',
          count: productQuantities[productId],
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return NextResponse.json({
        items: popularItems,
        period,
        date_range: {
          start_date: from,
          end_date: to,
        },
      });
    }
  } catch (error) {
    console.error('Unexpected error in /api/admin/analytics/popular-items:', error);
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status });
  }
}
