import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { orders, orderItems, tables, orderStatusEnum } from '@/infrastructure/database/schema'
import { eq, and, desc, gte, lte, inArray } from 'drizzle-orm'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

// GET /api/admin/orders - List orders with filters
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente', 'atendente'])

    const restaurantId = getRestaurantId(authUser)
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    if (isDevDatabase()) {
      // Build query conditions using Drizzle
      const conditions = [eq(orders.restaurant_id, restaurantId)]

      // Apply status filter
      if (status) {
        const statuses = status.split(',')
        if (statuses.length === 1) {
          conditions.push(eq(orders.status, statuses[0] as typeof orderStatusEnum[number]))
        } else {
          conditions.push(inArray(orders.status, statuses as typeof orderStatusEnum[number][]))
        }
      }

      // Apply date range filters
      if (dateFrom) {
        conditions.push(gte(orders.created_at, dateFrom))
      }

      if (dateTo) {
        conditions.push(lte(orders.created_at, dateTo + 'T23:59:59.999Z'))
      }

      // Get orders with pagination
      const ordersResult = await db
        .select({
          id: orders.id,
          status: orders.status,
          subtotal: orders.subtotal,
          tax: orders.tax,
          total: orders.total,
          payment_method: orders.payment_method,
          payment_status: orders.payment_status,
          created_at: orders.created_at,
          updated_at: orders.updated_at,
          table_id: orders.table_id,
        })
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.created_at))
        .limit(limit)
        .offset(offset)

      // Get total count
      const countResult = await db
        .select({ count: orders.id })
        .from(orders)
        .where(and(...conditions))

      const total = countResult.length

      // Get table info for each order
      const tableIds = ordersResult.filter(o => o.table_id).map(o => o.table_id as string)
      const tablesMap: Record<string, { id: string; number: number | null; name: string | null }> = {}

      if (tableIds.length > 0) {
        const tablesResult = await db
          .select({ id: tables.id, number: tables.number, name: tables.name })
          .from(tables)
          .where(inArray(tables.id, tableIds))

        tablesResult.forEach(t => {
          tablesMap[t.id] = t
        })
      }

      // Get items for each order
      const orderIds = ordersResult.map(o => o.id)
      const itemsMap: Record<string, Array<{ id: string; product_id: string; combo_id: string | null; quantity: number; unit_price: number; total_price: number; notes: string | null }>> = {}

      if (orderIds.length > 0) {
        const itemsResult = await db
          .select({
            id: orderItems.id,
            product_id: orderItems.product_id,
            combo_id: orderItems.combo_id,
            quantity: orderItems.quantity,
            unit_price: orderItems.unit_price,
            total_price: orderItems.total_price,
            notes: orderItems.notes,
            order_id: orderItems.order_id,
          })
          .from(orderItems)
          .where(inArray(orderItems.order_id, orderIds))

        itemsResult.forEach(item => {
          if (!itemsMap[item.order_id]) {
            itemsMap[item.order_id] = []
          }
          itemsMap[item.order_id].push(item)
        })
      }

      // Assemble response
      const ordersWithDetails = ordersResult.map(order => ({
        id: order.id,
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        table: order.table_id ? tablesMap[order.table_id] : null,
        items: itemsMap[order.id] || [],
      }))

      return NextResponse.json({
        orders: ordersWithDetails,
        total,
        limit,
        offset,
      })
    } else {
      const supabase = getSupabaseAdmin()

      // Build query using Supabase
      let query = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('restaurant_id', restaurantId)

      // Apply status filter
      if (status) {
        const statuses = status.split(',')
        if (statuses.length === 1) {
          query = query.eq('status', statuses[0])
        } else {
          query = query.in('status', statuses)
        }
      }

      // Apply date range filters
      if (dateFrom) {
        query = query.gte('created_at', dateFrom)
      }

      if (dateTo) {
        query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
      }

      const { data: ordersResult, error: ordersError, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (ordersError) {
        console.error('Error fetching orders:', ordersError)
        return NextResponse.json(
          { error: 'Erro ao buscar pedidos' },
          { status: 500 }
        )
      }

      const total = count || 0

      // Get table IDs
      const tableIds = ordersResult?.filter(o => o.table_id).map(o => o.table_id) || []
      const tablesMap: Record<string, { id: string; number: number | null; name: string | null }> = {}

      if (tableIds.length > 0) {
        const { data: tablesData } = await supabase
          .from('tables')
          .select('id, number, name')
          .in('id', tableIds)

        tablesData?.forEach(t => {
          tablesMap[t.id] = t
        })
      }

      // Get items for orders
      const orderIds = ordersResult?.map(o => o.id) || []
      const itemsMap: Record<string, unknown[]> = {}

      if (orderIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)

        itemsData?.forEach(item => {
          if (!itemsMap[item.order_id]) {
            itemsMap[item.order_id] = []
          }
          itemsMap[item.order_id].push(item)
        })
      }

      // Assemble response
      const ordersWithDetails = (ordersResult || []).map(order => ({
        ...order,
        table: order.table_id ? tablesMap[order.table_id] : null,
        items: itemsMap[order.id] || [],
      }))

      return NextResponse.json({
        orders: ordersWithDetails,
        total,
        limit,
        offset,
      })
    }
  } catch (error) {
    console.error('Unexpected error in /api/admin/orders:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
