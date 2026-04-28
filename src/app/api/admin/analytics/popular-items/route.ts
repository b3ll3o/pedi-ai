import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

type Period = 'day' | 'week' | 'month'

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

// GET /api/admin/analytics/popular-items - Get most popular items
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const { searchParams } = new URL(request.url)
    
    const period = (searchParams.get('period') || 'month') as Period
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Validate period
    if (!['day', 'week', 'month'].includes(period)) {
      return NextResponse.json(
        { error: 'Período inválido. Use: day, week ou month' },
        { status: 400 }
      )
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limite deve ser entre 1 e 100' },
        { status: 400 }
      )
    }

    // Default date range: last 30 days
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)
    const defaultEndDate = new Date()

    const from = startDate || defaultStartDate.toISOString().split('T')[0]
    const to = endDate || defaultEndDate.toISOString().split('T')[0]

    // Use admin client to bypass RLS for analytics queries
    const supabase = getSupabaseAdmin()

    // First, get all paid orders in the date range for this restaurant
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('payment_status', 'paid')
      .gte('created_at', from)
      .lte('created_at', to + 'T23:59:59.999Z')

    if (ordersError) {
      console.error('Error fetching orders for popular items:', ordersError)
      return NextResponse.json(
        { error: 'Erro ao buscar pedidos' },
        { status: 500 }
      )
    }

    const orderIds = (orders || []).map(o => o.id)

    if (orderIds.length === 0) {
      return NextResponse.json({
        items: [],
        period,
        date_range: {
          start_date: from,
          end_date: to,
        },
      })
    }

    // Get order items
    const { data: orderItemsData, error: itemsError } = await supabase
      .from('order_items')
      .select('product_id, quantity')
      .in('order_id', orderIds)

    if (itemsError) {
      console.error('Error fetching order items:', itemsError)
      return NextResponse.json(
        { error: 'Erro ao buscar itens dos pedidos' },
        { status: 500 }
      )
    }

    // Type the order items properly
    type OrderItemRow = {
      product_id: string | null
      quantity: number | null
    }

    const orderItems = orderItemsData as OrderItemRow[] | null

    // Aggregate by product (without names first)
    const productQuantities: Record<string, number> = {}

    ;(orderItems || []).forEach(item => {
      if (!item.product_id || item.quantity == null) return
      const productId = String(item.product_id)
      productQuantities[productId] = (productQuantities[productId] || 0) + item.quantity
    })

    // Get product names separately
    const productIds = Object.keys(productQuantities)
    const productNames: Record<string, string> = {}

    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds)

      if (productsData) {
        // Type the products data
        type ProductRow = { id: string | null; name: string | null }
        const products = productsData as ProductRow[]
        products.forEach(p => {
          if (p.id) {
            productNames[p.id] = p.name || 'Produto desconhecido'
          }
        })
      }
    }

    // Build final result
    const popularItems = productIds
      .map(productId => ({
        product_id: productId,
        product_name: productNames[productId] || 'Produto desconhecido',
        count: productQuantities[productId],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)

    return NextResponse.json({
      items: popularItems,
      period,
      date_range: {
        start_date: from,
        end_date: to,
      },
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/analytics/popular-items:', error)
    const status = (error as { status?: number }).status || 500
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status }
    )
  }
}
