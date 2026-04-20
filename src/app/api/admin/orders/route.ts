import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/orders - List orders with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('payment_status')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const limit = searchParams.get('limit') || '50'
    const offset = searchParams.get('offset') || '0'

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    let query = supabase
      .from('orders')
      .select(`
        *,
        table:tables(id, number, name),
        customer:customers(id, name, email)
      `)
      .eq('restaurant_id', restaurantId)

    // Apply status filter
    if (status) {
      const statuses = status.split(',')
      if (statuses.length === 1) {
        query = query.eq('status', status)
      } else {
        query = query.in('status', statuses)
      }
    }

    // Apply payment status filter
    if (paymentStatus) {
      const paymentStatuses = paymentStatus.split(',')
      if (paymentStatuses.length === 1) {
        query = query.eq('payment_status', paymentStatus)
      } else {
        query = query.in('payment_status', paymentStatuses)
      }
    }

    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      // Add 1 day to include the entire end date
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false })

    // Apply pagination
    const limitNum = parseInt(limit, 10)
    const offsetNum = parseInt(offset, 10)
    query = query.range(offsetNum, offsetNum + limitNum - 1)

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    // Fetch order items for each order
    const orderIds = orders?.map(o => o.id) || []
    
    let orderItems: Record<string, any[]> = {}
    if (orderIds.length > 0) {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          product:products(id, name, image_url)
        `)
        .in('order_id', orderIds)

      if (itemsError) {
        console.error('Error fetching order items:', itemsError)
      } else {
        // Group items by order_id
        orderItems = (items || []).reduce((acc, item) => {
          const key = String(item.order_id)
          if (!acc[key]) {
            acc[key] = []
          }
          acc[key].push(item)
          return acc
        }, {} as Record<string, any[]>)
      }
    }

    // Combine orders with their items
    const ordersWithItems = orders?.map(order => ({
      ...order,
      items: orderItems[String(order.id)] || [],
    })) || []

    return NextResponse.json({
      orders: ordersWithItems,
      total: count || ordersWithItems.length,
      limit: limitNum,
      offset: offsetNum,
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
