import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

// GET /api/admin/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const { searchParams } = new URL(request.url)
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Default date range: last 30 days
    const defaultDateFrom = new Date()
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 30)
    const defaultDateTo = new Date()

    const from = dateFrom || defaultDateFrom.toISOString().split('T')[0]
    const to = dateTo || defaultDateTo.toISOString().split('T')[0]

    const supabase = await createClient()

    // Fetch orders in date range
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(id, number, name)
      `)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59.999Z')

    if (ordersError) {
      console.error('Error fetching orders for analytics:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch analytics data' },
        { status: 500 }
      )
    }

    // Calculate totals
    const totalOrders = orders?.length || 0
    const totalRevenue = orders
      ?.filter(o => o.payment_status === 'paid')
      ?.reduce((sum, o) => sum + (typeof o.total === 'number' ? o.total : 0), 0) || 0

    const totalTax = orders
      ?.filter(o => o.payment_status === 'paid')
      ?.reduce((sum, o) => sum + (typeof o.tax === 'number' ? o.tax : 0), 0) || 0

    // Orders by status
    const ordersByStatus = (orders || []).reduce((acc, order) => {
      const status = String(order.status)
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Orders by payment status
    const ordersByPaymentStatus = (orders || []).reduce((acc, order) => {
      const paymentStatus = String(order.payment_status)
      acc[paymentStatus] = (acc[paymentStatus] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Revenue by day
    const revenueByDay: Record<string, number> = {}
    const ordersByDay: Record<string, number> = {}

    ;(orders || [])
      .filter(o => o.payment_status === 'paid')
      .forEach(order => {
        const createdAt = order.created_at
        if (typeof createdAt !== 'string') return
        const day = createdAt.split('T')[0]
        const orderTotal = typeof order.total === 'number' ? order.total : 0
        revenueByDay[day] = (revenueByDay[day] || 0) + orderTotal
        ordersByDay[day] = (ordersByDay[day] || 0) + 1
      })

    // Average order value
    const paidOrders = (orders || []).filter(o => o.payment_status === 'paid')
    const averageOrderValue = paidOrders.length > 0
      ? totalRevenue / paidOrders.length
      : 0

    // Cancellation rate
    const cancelledOrders = (orders || []).filter(o => o.status === 'cancelled').length
    const cancellationRate = totalOrders > 0
      ? (cancelledOrders / totalOrders) * 100
      : 0

    // Peak hours analysis
    const ordersByHour: Record<number, number> = {}
    ;(orders || []).forEach(order => {
      const createdAt = order.created_at
      if (typeof createdAt !== 'string') return
      const hour = new Date(createdAt).getHours()
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1
    })

    // Popular items (from order_items)
    const orderIds = (orders || []).map(o => o.id)
    let popularItems: Array<{ product_id: string; product_name: string; quantity: number; revenue: number }> = []

    if (orderIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          total_price,
          product:products(name)
        `)
        .in('order_id', orderIds)

      if (!itemsError && items) {
        type PopularItem = { product_id: string; product_name: string; quantity: number; revenue: number };
        const itemsByProduct: Record<string, PopularItem> = {}
        items.forEach(item => {
          const key = String(item.product_id)
          if (!itemsByProduct[key]) {
            itemsByProduct[key] = {
              product_id: String(item.product_id),
              product_name: 'Product', // Would need separate query to get name
              quantity: 0,
              revenue: 0,
            }
          }
          itemsByProduct[key].quantity += Number(item.quantity)
          itemsByProduct[key].revenue += Number(item.total_price)
        })
        popularItems = Object.values(itemsByProduct)
          .sort((a: PopularItem, b: PopularItem) => b.quantity - a.quantity)
          .slice(0, 10)
      }
    }

    // Tables with most orders
    const ordersByTable: Record<string, { table_id: string; table_name: string; order_count: number }> = {}
    ;(orders || []).forEach(order => {
      const tableId = order.table_id
      if (tableId) {
        const key = String(tableId)
        if (!ordersByTable[key]) {
          ordersByTable[key] = {
            table_id: String(tableId),
            table_name: `Table ${tableId}`, // Simplified without join
            order_count: 0,
          }
        }
        ordersByTable[key].order_count++
      }
    })

    const topTables = Object.values(ordersByTable)
      .sort((a, b) => b.order_count - a.order_count)
      .slice(0, 10)

    return NextResponse.json({
      summary: {
        total_orders: totalOrders,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_tax: Math.round(totalTax * 100) / 100,
        average_order_value: Math.round(averageOrderValue * 100) / 100,
        cancellation_rate: Math.round(cancellationRate * 100) / 100,
      },
      orders_by_status: ordersByStatus,
      orders_by_payment_status: ordersByPaymentStatus,
      revenue_by_day: revenueByDay,
      orders_by_day: ordersByDay,
      orders_by_hour: ordersByHour,
      popular_items: popularItems,
      top_tables: topTables,
      date_range: {
        from,
        to,
      },
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/analytics:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
