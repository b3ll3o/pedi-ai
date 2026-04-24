import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'
import type { tables } from '@/lib/supabase/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/tables/[id] - Get a single table
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const { id } = await params
    const restaurantId = getRestaurantId(authUser)
    const supabase = await createClient()

    const { data: table, error } = await supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (error) {
      console.error('Error fetching table:', error)
      return NextResponse.json(
        { error: 'Failed to fetch table' },
        { status: 500 }
      )
    }

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ table })
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/tables/[id] - Update a table
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const { id } = await params
    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { number, name, capacity, active, qr_code } = body

    const supabase = await createClient()

    // Check if table exists and belongs to user's restaurant
    const { data: existingTable, error: fetchError } = await supabase
      .from('tables')
      .select('id, restaurant_id, number')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (fetchError || !existingTable) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // If changing number, check it doesn't conflict with another table
    if (number !== undefined && number !== existingTable.number) {
      const { data: conflictTable, error: conflictError } = await supabase
        .from('tables')
        .select('id')
        .eq('restaurant_id', existingTable.restaurant_id as string)
        .eq('number', number)
        .neq('id', id)
        .single()

      if (conflictError && conflictError.code !== 'PGRST116') {
        console.error('Error checking table conflict:', conflictError)
        return NextResponse.json(
          { error: 'Failed to check table conflict' },
          { status: 500 }
        )
      }

      if (conflictTable) {
        return NextResponse.json(
          { error: 'Table number already exists for this restaurant' },
          { status: 409 }
        )
      }
    }

    const updateData: Partial<tables> = {}
    if (number !== undefined) updateData.number = number
    if (name !== undefined) updateData.name = name
    if (capacity !== undefined) updateData.capacity = capacity
    if (active !== undefined) updateData.active = active
    if (qr_code !== undefined) updateData.qr_code = qr_code

    const { data: table, error } = await supabase
      .from('tables')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating table:', error)
      return NextResponse.json(
        { error: 'Failed to update table' },
        { status: 500 }
      )
    }

    return NextResponse.json({ table })
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/tables/[id] - Delete a table
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const { id } = await params
    const restaurantId = getRestaurantId(authUser)
    const supabase = await createClient()

    // Check if table exists and belongs to user's restaurant
    const { data: existingTable, error: fetchError } = await supabase
      .from('tables')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (fetchError || !existingTable) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      )
    }

    // Check for active orders using this table
    const { data: activeOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id')
      .eq('table_id', id)
      .not('status', 'in', '(cancelled,delivered)')
      .limit(1)

    if (ordersError) {
      console.error('Error checking active orders:', ordersError)
      return NextResponse.json(
        { error: 'Failed to check active orders' },
        { status: 500 }
      )
    }

    if (activeOrders && activeOrders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete table with active orders' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('tables')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting table:', error)
      return NextResponse.json(
        { error: 'Failed to delete table' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
