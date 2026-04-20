import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import type { combos } from '@/lib/supabase/types'

type Combo = combos

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurant_id')

    if (!restaurantId) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: combos, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_items(
          *,
          product:products(*)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching combos:', error)
      return NextResponse.json(
        { error: 'Failed to fetch combos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ combos })
  } catch (error) {
    console.error('Unexpected error in /api/admin/combos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!restaurant_id || !name || bundle_price === undefined) {
      return NextResponse.json(
        { error: 'restaurant_id, name, and bundle_price are required' },
        { status: 400 }
      )
    }

    if (!combo_items || !Array.isArray(combo_items) || combo_items.length === 0) {
      return NextResponse.json(
        { error: 'combo_items array with at least one item is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Create combo
    const { data: combo, error: comboError } = await supabase
      .from('combos')
      .insert({
        restaurant_id,
        name,
        description: description || null,
        bundle_price,
        image_url: image_url || null,
        available: available ?? true
      })
      .select()
      .single()

    if (comboError) {
      console.error('Error creating combo:', comboError)
      return NextResponse.json(
        { error: 'Failed to create combo' },
        { status: 500 }
      )
    }

    // Create combo items
    const comboItemsWithIds = combo_items.map((item: { product_id: string; quantity: number }) => ({
      combo_id: combo.id as string,
      product_id: item.product_id,
      quantity: item.quantity || 1
    }))

    const { data: items, error: itemsError } = await supabase
      .from('combo_items')
      .insert(comboItemsWithIds)
      .select()

    if (itemsError) {
      console.error('Error creating combo items:', itemsError)
      // Rollback: delete the combo
      await supabase.from('combos').delete().eq('id', combo.id as string)
      return NextResponse.json(
        { error: 'Failed to create combo items, combo rolled back' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json(
      { combo, combo_items: items },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error in /api/admin/combos:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}