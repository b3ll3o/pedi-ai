import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

// GET /api/admin/orders - List orders with filters
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente', 'atendente'])

    const restaurantId = getRestaurantId(authUser)
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = (page - 1) * limit

    const supabase = await createClient()

    // Build query with restaurant_id from session
    let query = supabase
      .from('orders')
      .select(`
        id,
        status,
        total,
        created_at,
        updated_at,
        table:tables(id, number, name),
        customer:customers(id, name, email)
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
    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      // Include the entire end date
      query = query.lte('created_at', endDate + 'T23:59:59.999Z')
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
    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: orders || [],
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
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
