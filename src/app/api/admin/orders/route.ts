import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

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

    const supabaseAdmin = getSupabaseAdmin()

    // Build query with restaurant_id from session
    let query = supabaseAdmin
      .from('orders')
      .select(`
        id,
        status,
        subtotal,
        tax,
        total,
        payment_method,
        payment_status,
        created_at,
        updated_at,
        table:tables(id, number, name),
        items:order_items(id, product_id, combo_id, quantity, unit_price, total_price, notes)
      `, { count: 'exact' })
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

    // Apply date range filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59.999Z')
    }

    // Order by created_at descending
    query = query.order('created_at', { ascending: false })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: 'Falha ao buscar pedidos' },
        { status: 500 }
      )
    }

    const total = count || 0

    return NextResponse.json({
      orders: orders || [],
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/orders:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: message },
      { status: 401 }
    )
  }
}
