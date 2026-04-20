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

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('category.restaurant_id', restaurantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }

    return NextResponse.json({ products })
  } catch (error) {
    console.error('Unexpected error in /api/admin/products:', error)
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
      category_id,
      name,
      description,
      image_url,
      price,
      dietary_labels,
      available,
      sort_order
    } = body

    if (!restaurant_id || !category_id || !name || price === undefined) {
      return NextResponse.json(
        { error: 'restaurant_id, category_id, name, and price are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify category belongs to restaurant
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category_id)
      .eq('restaurant_id', restaurant_id)
      .is('deleted_at', null)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Category not found or does not belong to this restaurant' },
        { status: 404 }
      )
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        category_id,
        name,
        description: description || null,
        image_url: image_url || null,
        price,
        dietary_labels: dietary_labels || null,
        available: available ?? true,
        sort_order: sort_order ?? 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating product:', error)
      return NextResponse.json(
        { error: 'Failed to create product' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error in /api/admin/products:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
