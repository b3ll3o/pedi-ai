import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { orders, orderItems, orderStatusHistory } from '@/infrastructure/database/schema'
import { eq, asc } from 'drizzle-orm'

type OrderStatus = 'pending_payment' | 'paid' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

interface OrderItemResponse {
  id: string
  order_id: string
  product_id: string
  combo_id: string | null
  quantity: number
  unit_price: number
  total_price: number
  notes: string | null
}

interface StatusHistoryEntry {
  id: string
  status: OrderStatus
  notes: string | null
  created_at: string
}

interface OrderResponse {
  id: string
  status: OrderStatus
  payment_status: PaymentStatus
  items: OrderItemResponse[]
  status_history: StatusHistoryEntry[]
  created_at: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    if (isDevDatabase()) {
      // Fetch order
      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);

      if (!orderResult || orderResult.length === 0) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      const order = orderResult[0];

      if (order.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      // Fetch order items
      const itemsResult = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.order_id, id));

      // Fetch status history
      const historyResult = await db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.order_id, id))
        .orderBy(asc(orderStatusHistory.created_at));

      const response: OrderResponse = {
        id: order.id,
        status: order.status as OrderStatus,
        payment_status: order.payment_status as PaymentStatus,
        items: itemsResult.map(item => ({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          combo_id: item.combo_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          notes: item.notes,
        })),
        status_history: historyResult.map(entry => ({
          id: entry.id,
          status: entry.status as OrderStatus,
          notes: entry.notes,
          created_at: entry.created_at,
        })),
        created_at: order.created_at
      }

      return NextResponse.json(response)
    } else {
      const supabaseAdmin = getSupabaseAdmin()

      // Fetch order
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single()

      if (orderError || !order) {
        return NextResponse.json(
          { error: 'Order not found' },
          { status: 404 }
        )
      }

      // Fetch order items
      const { data: items, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', id)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
        return NextResponse.json(
          { error: 'Failed to fetch order items' },
          { status: 500 }
        )
      }

      // Fetch status history
      const { data: statusHistory, error: statusHistoryError } = await supabaseAdmin
        .from('order_status_history')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: true })

      if (statusHistoryError) {
        console.error('Error fetching status history:', statusHistoryError)
        return NextResponse.json(
          { error: 'Failed to fetch status history' },
          { status: 500 }
        )
      }

      const response: OrderResponse = {
        id: order.id as string,
        status: order.status as OrderStatus,
        payment_status: order.payment_status as PaymentStatus,
        items: items.map(item => ({
          id: item.id as string,
          order_id: item.order_id as string,
          product_id: item.product_id as string,
          combo_id: item.combo_id as string | null,
          quantity: item.quantity as number,
          unit_price: item.unit_price as number,
          total_price: item.total_price as number,
          notes: item.notes as string | null
        })),
        status_history: statusHistory.map(entry => ({
          id: entry.id as string,
          status: entry.status as OrderStatus,
          notes: entry.notes as string | null,
          created_at: entry.created_at as string
        })),
        created_at: order.created_at as string
      }

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
