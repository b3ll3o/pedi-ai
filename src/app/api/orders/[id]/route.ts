import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { orders, order_items, order_status_history } from '@/lib/supabase/types'

type OrderItem = Omit<order_items, 'created_at'>
type StatusHistoryEntry = Omit<order_status_history, 'order_id' | 'created_at'>

interface OrderResponse {
  id: string
  status: orders['status']
  payment_status: orders['payment_status']
  items: OrderItem[]
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

    const supabase = await createClient()

    // Fetch order
    const { data: order, error: orderError } = await supabase
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
    const { data: items, error: itemsError } = await supabase
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
    const { data: statusHistory, error: statusHistoryError } = await supabase
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
      id: order.id,
      status: order.status,
      payment_status: order.payment_status,
      items: items.map(item => ({
        id: item.id,
        order_id: item.order_id,
        product_id: item.product_id,
        combo_id: item.combo_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes
      })),
      status_history: statusHistory.map(entry => ({
        id: entry.id,
        status: entry.status,
        notes: entry.notes,
        created_at: entry.created_at
      })),
      created_at: order.created_at
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in /api/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
