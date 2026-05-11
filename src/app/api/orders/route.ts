import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { order_items } from '@/lib/supabase/types'

/**
 * Admin client for bypassing RLS - uses service role key directly
 */
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

// GET /api/orders - Fetch orders for a customer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customer_id')
    const restaurantId = searchParams.get('restaurant_id')

    if (!customerId || !restaurantId) {
      return NextResponse.json(
        { error: 'customer_id and restaurant_id are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, total, created_at, payment_status')
      .eq('customer_id', customerId)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Unexpected error in GET /api/orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

interface OrderItemInput {
  product_id: string
  quantity: number
  unit_price: number
  modifiers?: { name: string; price: number }[]
  notes?: string
}

interface CreateOrderRequest {
  table_id: string | null
  customer_id: string
  customer_phone?: string
  customer_name?: string
  restaurant_id?: string
  items: OrderItemInput[]
  payment_method?: 'pix' | 'card'
  idempotency_key: string
}

const TAX_RATE = 0.1 // 10% tax

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json()

    // Validate required fields
    if (!body.customer_id || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'customer_id and items are required' },
        { status: 400 }
      )
    }

    if (!body.idempotency_key) {
      return NextResponse.json(
        { error: 'idempotency_key is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const supabaseAdmin = getSupabaseAdmin()

    // Check idempotency - prevent duplicate orders (uses admin client to bypass RLS)
    const { data: existingOrder, error: idempotencyError } = await supabaseAdmin
      .from('orders')
      .select('id, status, total, created_at')
      .eq('customer_id', body.customer_id)
      .eq('idempotency_key', body.idempotency_key)
      .single()

    if (idempotencyError && idempotencyError.code !== 'PGRST116') {
      console.error('Idempotency check error:', idempotencyError)
      return NextResponse.json(
        { error: 'Failed to check idempotency' },
        { status: 500 }
      )
    }

    if (existingOrder) {
      return NextResponse.json({
        id: existingOrder.id,
        status: existingOrder.status,
        total: existingOrder.total,
        created_at: existingOrder.created_at
      })
    }

    // Calculate totals
    let subtotal = 0
    for (const item of body.items) {
      const itemSubtotal = item.unit_price * item.quantity
      const modifiersTotal = (item.modifiers || []).reduce((sum, m) => sum + m.price, 0) * item.quantity
      subtotal += itemSubtotal + modifiersTotal
    }

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100
    const total = Math.round((subtotal + tax) * 100) / 100

    // Determine restaurant_id: from table > from body > first restaurant (fallback)
    let restaurantId: string | null = null

    if (body.table_id) {
      const { data: table, error: tableError } = await supabase
        .from('tables')
        .select('restaurant_id')
        .eq('id', body.table_id)
        .single()

      if (tableError) {
        console.error('Error fetching table:', tableError)
        return NextResponse.json(
          { error: 'Invalid table_id' },
          { status: 400 }
        )
      }

      restaurantId = table.restaurant_id as string
    }

    // If no table_id, use restaurant_id from request body (for anonymous/phone orders)
    if (!restaurantId && body.restaurant_id) {
      restaurantId = body.restaurant_id
    }

    // Final fallback: get first restaurant (for customer orders without table)
    if (!restaurantId) {
      const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id')
        .limit(1)
        .single()

      if (restaurantError || !restaurants) {
        console.error('Error fetching restaurant:', restaurantError)
        return NextResponse.json(
          { error: 'No restaurant found' },
          { status: 400 }
        )
      }

      restaurantId = restaurants.id as string
    }

    // Insert order
    // Map 'card' to 'credit_card' for Supabase enum compatibility
    const paymentMethodMap: Record<'pix' | 'card', 'pix' | 'credit_card'> = {
      pix: 'pix',
      card: 'credit_card',
    }
    const orderData = {
      restaurant_id: restaurantId,
      table_id: body.table_id || null,
      customer_id: body.customer_id ?? body.customer_phone ?? null,
      customer_phone: body.customer_phone || null,
      customer_name: body.customer_name || null,
      status: 'received' as const,
      subtotal,
      tax,
      total,
      payment_method: null,
      payment_status: 'not_applicable' as const,
      idempotency_key: body.idempotency_key
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single()

    if (orderError) {
      console.error('Error inserting order:', orderError)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Insert order items
    const orderId = order.id as string
    const orderItemsToInsert: Omit<order_items, 'id' | 'created_at'>[] = body.items.map(item => ({
      order_id: orderId,
      product_id: item.product_id,
      combo_id: null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      notes: item.notes || null
    }))

    if (orderItemsToInsert.length > 0) {
      const { error: itemsError } = await supabaseAdmin
        .from('order_items')
        .insert(orderItemsToInsert)

      if (itemsError) {
        console.error('Error inserting order items:', itemsError)
        // Rollback - delete the order
        await supabase.from('orders').delete().eq('id', orderId)
        return NextResponse.json(
          { error: 'Failed to create order items' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      total: order.total,
      created_at: order.created_at
    })
  } catch (error) {
    console.error('Unexpected error in /api/orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
