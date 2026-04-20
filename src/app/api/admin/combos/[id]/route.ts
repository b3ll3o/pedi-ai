import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import type { combos } from '@/lib/supabase/types'

type Combo = combos

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

    const { data: combo, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (error || !combo) {
      return NextResponse.json(
        { error: 'Combo not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ combo })
  } catch (error) {
    console.error('Unexpected error in /api/admin/combos/[id]:', error)
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
    const {
      restaurant_id,
      name,
      description,
      bundle_price,
      image_url,
      available,
      combo_items
    } = body

    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify combo exists and belongs to restaurant
    const { data: existing, error: fetchError } = await supabase
      .from('combos')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurant_id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Combo not found' },
        { status: 404 }
      )
    }

    // Update combo fields
    const updateData: {
      name?: string;
      description?: string | null;
      bundle_price?: number;
      image_url?: string | null;
      available?: boolean;
    } = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (bundle_price !== undefined) updateData.bundle_price = bundle_price
    if (image_url !== undefined) updateData.image_url = image_url
    if (available !== undefined) updateData.available = available

    const { data: combo, error: comboError } = await supabase
      .from('combos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (comboError) {
      console.error('Error updating combo:', comboError)
      return NextResponse.json(
        { error: 'Failed to update combo' },
        { status: 500 }
      )
    }

    // Update combo items if provided
    let items = null
    if (combo_items && Array.isArray(combo_items)) {
      // Delete existing combo items
      await supabase.from('combo_items').delete().eq('combo_id', id)

      // Insert new combo items
      if (combo_items.length > 0) {
        const comboItemsWithIds = combo_items.map((item: { product_id: string; quantity: number }) => ({
          combo_id: id,
          product_id: item.product_id,
          quantity: item.quantity || 1
        }))

        const { data: newItems, error: itemsError } = await supabase
          .from('combo_items')
          .insert(comboItemsWithIds)
          .select()

        if (itemsError) {
          console.error('Error updating combo items:', itemsError)
          return NextResponse.json(
            { error: 'Failed to update combo items' },
            { status: 500 }
          )
        }
        items = newItems
      }
    }

    // Fetch updated combo with items
    const { data: updatedCombo, error: fetchUpdatedError } = await supabase
      .from('combos')
      .select(`
        *,
        combo_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .single()

    if (fetchUpdatedError) {
      console.error('Error fetching updated combo:', fetchUpdatedError)
      return NextResponse.json(
        { error: 'Failed to fetch updated combo' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ combo: updatedCombo })
  } catch (error) {
    console.error('Unexpected error in /api/admin/combos/[id]:', error)
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

    // Verify combo exists and belongs to restaurant
    const { data: existing, error: fetchError } = await supabase
      .from('combos')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Combo not found' },
        { status: 404 }
      )
    }

    // Soft delete - set deleted_at on combo items first, then combo
    await supabase
      .from('combo_items')
      .delete()
      .eq('combo_id', id)

    const { error } = await supabase
      .from('combos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting combo:', error)
      return NextResponse.json(
        { error: 'Failed to delete combo' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in /api/admin/combos/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}