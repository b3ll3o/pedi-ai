import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import type { modifier_groups, modifier_values } from '@/lib/supabase/types'

type ModifierGroup = modifier_groups
type ModifierValue = modifier_values

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

    const { data: groups, error } = await supabase
      .from('modifier_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching modifier groups:', error)
      return NextResponse.json(
        { error: 'Failed to fetch modifier groups' },
        { status: 500 }
      )
    }

    return NextResponse.json({ modifier_groups: groups })
  } catch (error) {
    console.error('Unexpected error in /api/admin/modifiers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id, name, required, min_selections, max_selections } = body

    if (!restaurant_id || !name) {
      return NextResponse.json(
        { error: 'restaurant_id and name are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: group, error } = await supabase
      .from('modifier_groups')
      .insert({
        restaurant_id,
        name,
        required: required ?? false,
        min_selections: min_selections ?? 0,
        max_selections: max_selections ?? 1
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating modifier group:', error)
      return NextResponse.json(
        { error: 'Failed to create modifier group' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ modifier_group: group }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in /api/admin/modifiers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}