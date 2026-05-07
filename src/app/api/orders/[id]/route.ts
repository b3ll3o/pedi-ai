import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { orders, order_items, order_status_history } from '@/lib/supabase/types'

type OrderItem = Omit<order_items, 'created_at'>
type StatusHistoryEntry = Omit<order_status_history, 'order_id' | 'created_at'>

function getSupabaseAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  )
}

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
      status: order.status as orders['status'],
      payment_status: order.payment_status as orders['payment_status'],
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
        status: entry.status as orders['status'],
        notes: entry.notes as string | null,
        created_at: entry.created_at as string
      })),
      created_at: order.created_at as string
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
