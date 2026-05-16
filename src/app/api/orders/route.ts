import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { orders, orderItems, tables, restaurants } from '@/infrastructure/database/schema'
import { eq, desc, and } from 'drizzle-orm'

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

    if (isDevDatabase()) {
      const result = await db
        .select({
          id: orders.id,
          status: orders.status,
          total: orders.total,
          created_at: orders.created_at,
          payment_status: orders.payment_status,
        })
        .from(orders)
        .where(and(eq(orders.customer_id, customerId), eq(orders.restaurant_id, restaurantId)))
        .orderBy(desc(orders.created_at));

      return NextResponse.json(result);
    } else {
      const supabase = getSupabaseAdmin();

      const { data: ordersData, error: ordersError } = await supabase
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

      return NextResponse.json(ordersData)
    }
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

    if (body.payment_method !== undefined && !['pix', 'card'].includes(body.payment_method)) {
      return NextResponse.json(
        { error: 'Invalid payment_method. Must be pix or card' },
        { status: 400 }
      )
    }

    if (isDevDatabase()) {
      // Check idempotency
      const existingOrder = await db
        .select()
        .from(orders)
        .where(and(eq(orders.customer_id, body.customer_id), eq(orders.idempotency_key, body.idempotency_key)))
        .limit(1);

      if (existingOrder.length > 0) {
        const order = existingOrder[0];
        return NextResponse.json({
          id: order.id,
          status: order.status,
          total: order.total,
          created_at: order.created_at
        });
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
        const tableResult = await db
          .select({ restaurant_id: tables.restaurant_id })
          .from(tables)
          .where(eq(tables.id, body.table_id))
          .limit(1);

        if (tableResult.length === 0) {
          return NextResponse.json(
            { error: 'Invalid table_id' },
            { status: 400 }
          )
        }

        restaurantId = tableResult[0].restaurant_id;
      }

      if (!restaurantId && body.restaurant_id) {
        restaurantId = body.restaurant_id
      }

      if (!restaurantId) {
        const restaurantResult = await db
          .select({ id: restaurants.id })
          .from(restaurants)
          .limit(1);

        if (restaurantResult.length === 0) {
          return NextResponse.json(
            { error: 'No restaurant found' },
            { status: 400 }
          )
        }

        restaurantId = restaurantResult[0].id;
      }

      const now = new Date().toISOString();
      const orderId = crypto.randomUUID();

      // Insert order
      const newOrder = {
        id: orderId,
        restaurant_id: restaurantId,
        table_id: body.table_id || null,
        customer_id: body.customer_id,
        customer_phone: body.customer_phone || null,
        customer_name: body.customer_name || null,
        status: 'pending_payment' as const,
        subtotal,
        tax,
        total,
        payment_method: null,
        payment_status: 'pending' as const,
        idempotency_key: body.idempotency_key,
        created_at: now,
        updated_at: now,
      };

      await db.insert(orders).values(newOrder);

      // Insert order items
      for (const item of body.items) {
        const itemId = crypto.randomUUID();
        await db.insert(orderItems).values({
          id: itemId,
          order_id: orderId,
          product_id: item.product_id,
          combo_id: null,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.unit_price * item.quantity,
          notes: item.notes || null,
          created_at: now,
        });
      }

      return NextResponse.json({
        id: orderId,
        status: 'received',
        total,
        created_at: now
      });
    } else {
      const supabaseAdmin = getSupabaseAdmin();

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
        const { data: table, error: tableError } = await supabaseAdmin
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
        const { data: restaurantsData, error: restaurantError } = await supabaseAdmin
          .from('restaurants')
          .select('id')
          .limit(1)
          .single()

        if (restaurantError || !restaurantsData) {
          console.error('Error fetching restaurant:', restaurantError)
          return NextResponse.json(
            { error: 'No restaurant found' },
            { status: 400 }
          )
        }

        restaurantId = restaurantsData.id as string
      }

      // Insert order
      const orderData = {
        restaurant_id: restaurantId,
        table_id: body.table_id || null,
        customer_id: body.customer_id ?? body.customer_phone ?? null,
        customer_phone: body.customer_phone || null,
        customer_name: body.customer_name || null,
        status: 'pending_payment' as const,
        subtotal,
        tax,
        total,
        payment_method: null,
        payment_status: 'pending' as const,
        idempotency_key: body.idempotency_key
      }

      const { data: order, error: orderError } = await supabaseAdmin
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
      const orderItemsToInsert = body.items.map(item => ({
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
          await supabaseAdmin.from('orders').delete().eq('id', orderId)
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
    }
  } catch (error) {
    console.error('Unexpected error in /api/orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
