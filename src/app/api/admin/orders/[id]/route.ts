import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/orders/[id] - Get order details with items
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const supabase = await createClient()

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        table:tables(id, number, name),
        customer:customers(id, name, email, phone)
      `)
      .eq('id', id)
      .single()

    if (orderError) {
      console.error('Error fetching order:', orderError)
      return NextResponse.json(
        { error: 'Failed to fetch order' },
        { status: 500 }
      )
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Fetch order items
    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        *,
        product:products(id, name, image_url, price)
      `)
      .eq('order_id', id)

    if (itemsError) {
      console.error('Error fetching order items:', itemsError)
      return NextResponse.json(
        { error: 'Failed to fetch order items' },
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
      // Continue without history
    }

    return NextResponse.json({
      order: {
        ...order,
        items: items || [],
        status_history: history || [],
      },
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/orders/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
