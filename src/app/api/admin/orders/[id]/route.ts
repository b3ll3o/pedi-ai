import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, isDevDatabase } from '@/infrastructure/database'
import { orders, orderItems, tables, orderStatusHistory } from '@/infrastructure/database/schema'
import { eq, inArray } from 'drizzle-orm'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/orders/[id] - Get order details with items, history, customer, table, payment
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente', 'atendente'])

    const restaurantId = getRestaurantId(authUser)
    const { id } = await params

    if (isDevDatabase()) {
      // Fetch order with restaurant_id check
      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1)
        .get()

      if (!orderResult || orderResult.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Pedido não encontrado' },
          { status: 404 }
        )
      }

      // Fetch order items with product details
      const itemsResult = await db
        .select({
          id: orderItems.id,
          product_id: orderItems.product_id,
          combo_id: orderItems.combo_id,
          quantity: orderItems.quantity,
          unit_price: orderItems.unit_price,
          total_price: orderItems.total_price,
          notes: orderItems.notes,
          created_at: orderItems.created_at,
        })
        .from(orderItems)
        .where(eq(orderItems.order_id, id))

      // Fetch status history
      const historyResult = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.order_id, id))

      // Fetch table info if exists
      let tableInfo = null
      if (orderResult.table_id) {
        const tableResult = await db
          .select({ id: tables.id, number: tables.number, name: tables.name })
          .from(tables)
          .where(eq(tables.id, orderResult.table_id))
          .limit(1)
          .get()
        tableInfo = tableResult || null
      }

      // Payment info
      const paymentInfo = {
        payment_status: orderResult.payment_status,
        payment_method: orderResult.payment_method,
        subtotal: orderResult.subtotal,
        tax: orderResult.tax,
        total: orderResult.total,
      }

      return NextResponse.json({
        data: {
          ...orderResult,
          items: itemsResult,
          status_history: historyResult,
          customer: null, // Customer info not available in dev schema
          table: tableInfo,
          payment: paymentInfo,
        },
      })
    }

    // Production: use Supabase
    const supabase = await createClient()

    // Fetch order with restaurant_id check (return 404 if not found or wrong restaurant)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(id, number, name),
        customer:customers(id, name, email, phone)
      `)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (orderError || !order) {
      // Return 404 to prevent enumeration (per spec)
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      )
    }

    // Fetch order items with product details
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        combo_id,
        quantity,
        unit_price,
        total_price,
        notes,
        created_at,
        product:products(id, name, image_url, price)
      `)
      .eq('order_id', id)

    if (itemsError) {
      console.error('Error fetching order items:', itemsError)
      return NextResponse.json(
        { error: 'Falha ao buscar itens do pedido' },
        { status: 500 }
      )
    }

    // Fetch status history
    const { data: history, error: historyError } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })

    if (historyError) {
      console.error('Error fetching order history:', historyError)
    }

    // Fetch payment info (order has payment_status and payment_method)
    const paymentInfo = {
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
    }

    return NextResponse.json({
      data: {
        ...order,
        items: items || [],
        status_history: history || [],
        customer: order.customer,
        table: order.table,
        payment: paymentInfo,
      },
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/orders/[id]:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: message },
      { status: 401 }
    )
  }
}
