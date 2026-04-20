import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'

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

    const supabase = await createClient()

    // Fetch modifier group
    const { data: group, error: groupError } = await supabase
      .from('modifier_groups')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      )
    }

    // Fetch modifier values
    const { data: values, error: valuesError } = await supabase
      .from('modifier_values')
      .select('*')
      .eq('modifier_group_id', id)
      .order('created_at', { ascending: true })

    if (valuesError) {
      console.error('Error fetching modifier values:', valuesError)
      return NextResponse.json(
        { error: 'Failed to fetch modifier values' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      modifier_group: group,
      modifier_values: values
    })
  } catch (error) {
    console.error('Unexpected error in /api/admin/modifiers/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { restaurant_id, name, required, min_selections, max_selections } = body

    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify modifier group exists and belongs to restaurant
    const { data: existing, error: fetchError } = await supabase
      .from('modifier_groups')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurant_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      )
    }

    const updateData: {
      name?: string;
      required?: boolean;
      min_selections?: number;
      max_selections?: number;
    } = {}
    if (name !== undefined) updateData.name = name
    if (required !== undefined) updateData.required = required
    if (min_selections !== undefined) updateData.min_selections = min_selections
    if (max_selections !== undefined) updateData.max_selections = max_selections

    const { data: group, error } = await supabase
      .from('modifier_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating modifier group:', error)
      return NextResponse.json(
        { error: 'Failed to update modifier group' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ modifier_group: group })
  } catch (error) {
    console.error('Unexpected error in /api/admin/modifiers/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const supabase = await createClient()

    // Verify modifier group exists and belongs to restaurant
    const { data: existing, error: fetchError } = await supabase
      .from('modifier_groups')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Modifier group not found' },
        { status: 404 }
      )
    }

    // Soft delete - delete associated modifier values first, then the group
    const { error: valuesError } = await supabase
      .from('modifier_values')
      .delete()
      .eq('modifier_group_id', id)

    if (valuesError) {
      console.error('Error deleting modifier values:', valuesError)
    }

    const { error } = await supabase
      .from('modifier_groups')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting modifier group:', error)
      return NextResponse.json(
        { error: 'Failed to delete modifier group' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in /api/admin/modifiers/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}