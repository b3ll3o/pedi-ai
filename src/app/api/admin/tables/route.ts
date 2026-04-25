import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'


// GET /api/admin/tables - List all tables for a restaurant
export async function GET(_request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const supabase = await createClient()

    const { data: tables, error } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('number', { ascending: true })

    if (error) {
      console.error('Error fetching tables:', error)
      return NextResponse.json(
        { error: 'Failed to fetch tables' },
        { status: 500 }
      )
    }

    return NextResponse.json({ tables })
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/tables - Create a new table
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { number, name, capacity, active } = body

    if (number === undefined) {
      return NextResponse.json(
        { error: 'number is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if table number already exists for this restaurant
    const { data: existingTable, error: checkError } = await supabase
      .from('tables')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('number', number)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing table:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing table' },
        { status: 500 }
      )
    }

    if (existingTable) {
      return NextResponse.json(
        { error: 'Table number already exists for this restaurant' },
        { status: 409 }
      )
    }

    const { data: table, error } = await supabase
      .from('tables')
      .insert({
        restaurant_id: restaurantId,
        number,
        name: name || null,
        capacity: capacity || null,
        active: active ?? true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating table:', error)
      return NextResponse.json(
        { error: 'Failed to create table' },
        { status: 500 }
      )
    }

    return NextResponse.json({ table }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in /api/admin/tables:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
