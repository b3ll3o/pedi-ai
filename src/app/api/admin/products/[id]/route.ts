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

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('id', id)
      .eq('category.restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    console.error('Unexpected error in /api/admin/products/[id]:', error)
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
      category_id,
      name,
      description,
      image_url,
      price,
      dietary_labels,
      available,
      sort_order
    } = body

    if (!restaurant_id) {
      return NextResponse.json(
        { error: 'restaurant_id is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify product exists and belongs to restaurant via category
    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select('id, category:categories!inner(restaurant_id)')
      .eq('id', id)
      .eq('categories.restaurant_id', restaurant_id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // If category_id is provided, verify it belongs to restaurant
    if (category_id) {
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
    }

    const updateData: {
      category_id?: string;
      name?: string;
      description?: string | null;
      image_url?: string | null;
      price?: number;
      dietary_labels?: string[] | null;
      available?: boolean;
      sort_order?: number;
    } = {}
    if (category_id !== undefined) updateData.category_id = category_id
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (image_url !== undefined) updateData.image_url = image_url
    if (price !== undefined) updateData.price = price
    if (dietary_labels !== undefined) updateData.dietary_labels = dietary_labels
    if (available !== undefined) updateData.available = available
    if (sort_order !== undefined) updateData.sort_order = sort_order

    const { data: product, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating product:', error)
      return NextResponse.json(
        { error: 'Failed to update product' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ product })
  } catch (error) {
    console.error('Unexpected error in /api/admin/products/[id]:', error)
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

    // Verify product exists and belongs to restaurant via category
    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select('id, category:categories!inner(restaurant_id)')
      .eq('id', id)
      .eq('categories.restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Soft delete - set deleted_at
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Error deleting product:', error)
      return NextResponse.json(
        { error: 'Failed to delete product' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in /api/admin/products/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
