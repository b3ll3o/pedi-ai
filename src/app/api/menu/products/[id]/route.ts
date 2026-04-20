import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { categories, products, modifier_groups, modifier_values } from '@/lib/supabase/types'

type ModifierGroupWithValues = {
  id: string
  name: string
  required: boolean
  min_selections: number
  max_selections: number
  values: Array<{
    id: string
    name: string
    price_adjustment: number
  }>
}

interface ProductDetailResponse {
  id: string
  name: string
  description: string | null
  image_url: string | null
  price: number
  dietary_labels: string[] | null
  available: boolean
  category: { id: string; name: string }
  modifier_groups: ModifierGroupWithValues[]
}

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

    // Fetch product with category join
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name)
      `)
      .eq('id', id)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify product belongs to restaurant via category
    const category = product.category as unknown as { id: string; name: string } | null
    if (!category || category.id === null) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify category belongs to restaurant
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id, restaurant_id')
      .eq('id', category.id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (categoryError || !categoryData) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Fetch modifier groups for this product via junction table
    const { data: productModifierGroups, error: pmgError } = await supabase
      .from('product_modifier_groups')
      .select('modifier_group_id')
      .eq('product_id', id)

    if (pmgError) {
      console.error('Error fetching product modifier groups:', pmgError)
      return NextResponse.json(
        { error: 'Failed to fetch modifier groups' },
        { status: 500 }
      )
    }

    const modifierGroupIds = productModifierGroups.map(pmg => pmg.modifier_group_id)

    // Fetch modifier groups
    const { data: modifierGroups, error: modifierGroupsError } = modifierGroupIds.length > 0
      ? await supabase
          .from('modifier_groups')
          .select('*')
          .in('id', modifierGroupIds)
          .eq('restaurant_id', restaurantId)
      : { data: [], error: null }

    if (modifierGroupsError) {
      console.error('Error fetching modifier groups:', modifierGroupsError)
      return NextResponse.json(
        { error: 'Failed to fetch modifier groups' },
        { status: 500 }
      )
    }

    // Fetch modifier values for these groups
    const { data: modifierValues, error: modifierValuesError } = modifierGroupIds.length > 0
      ? await supabase
          .from('modifier_values')
          .select('*')
          .in('modifier_group_id', modifierGroupIds)
          .eq('available', true)
      : { data: [], error: null }

    if (modifierValuesError) {
      console.error('Error fetching modifier values:', modifierValuesError)
      return NextResponse.json(
        { error: 'Failed to fetch modifier values' },
        { status: 500 }
      )
    }

    // Build response
    const response: ProductDetailResponse = {
      id: product.id as string,
      name: product.name as string,
      description: product.description as string | null,
      image_url: product.image_url as string | null,
      price: product.price as number,
      dietary_labels: product.dietary_labels as string[] | null,
      available: product.available as boolean,
      category: category,
      modifier_groups: modifierGroups.map(mg => ({
        id: mg.id as string,
        name: mg.name as string,
        required: mg.required as boolean,
        min_selections: mg.min_selections as number,
        max_selections: mg.max_selections as number,
        values: modifierValues
          .filter(mv => mv.modifier_group_id === mg.id)
          .map(mv => ({
            id: mv.id as string,
            name: mv.name as string,
            price_adjustment: mv.price_adjustment as number
          }))
      }))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in /api/menu/products/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
