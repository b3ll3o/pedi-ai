import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import type { categories } from '@/lib/supabase/types'

type Category = categories

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

    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Unexpected error in /api/admin/categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id, name, description, image_url, sort_order, active } = body

    if (!restaurant_id || !name) {
      return NextResponse.json(
        { error: 'restaurant_id and name are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        restaurant_id,
        name,
        description: description || null,
        image_url: image_url || null,
        sort_order: sort_order ?? 0,
        active: active ?? true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in /api/admin/categories:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
