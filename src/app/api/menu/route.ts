import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { categories, products, modifier_groups, modifier_values, combos, Database } from '@/lib/supabase/types'

type Category = categories
type Product = products
type ModifierGroup = Omit<modifier_groups, 'created_at'> & {
  modifier_values: Omit<modifier_values, 'modifier_group_id' | 'created_at'>[]
}
type Combo = combos

interface MenuResponse {
  categories: Category[]
  products: Product[]
  modifier_groups: ModifierGroup[]
  combos: Combo[]
}

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

    // Fetch categories (active only, sorted by sort_order)
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }
    const categories = categoriesData as Category[]

    // Fetch products (available only)
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('sort_order', { ascending: true })

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      )
    }
    const products = productsData as Product[]

    // Filter products by restaurant_id via category join
    const categoryIds = categories.map(c => c.id)
    const filteredProducts = products.filter(p => categoryIds.includes(p.category_id))

    // Fetch modifier groups for this restaurant
    const { data: modifierGroupsData, error: modifierGroupsError } = await supabase
      .from('modifier_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)

    if (modifierGroupsError) {
      console.error('Error fetching modifier groups:', modifierGroupsError)
      return NextResponse.json(
        { error: 'Failed to fetch modifier groups' },
        { status: 500 }
      )
    }
    const modifierGroups = modifierGroupsData as (Omit<modifier_groups, 'created_at'>)[]

    // Fetch modifier values for these groups
    const modifierGroupIds = modifierGroups.map(mg => mg.id)
    const { data: modifierValuesData, error: modifierValuesError } = modifierGroupIds.length > 0
      ? await supabase
          .from('modifier_values')
          .select('*')
          .in('modifier_group_id', modifierGroupIds)
          .eq('available', true)
      : { data: [], error: null }
    const modifierValues = modifierValuesData as Omit<modifier_values, 'created_at'>[]

    if (modifierValuesError) {
      console.error('Error fetching modifier values:', modifierValuesError)
      return NextResponse.json(
        { error: 'Failed to fetch modifier values' },
        { status: 500 }
      )
    }

    // Nest modifier values within groups
    type ModifierValueForGroup = Omit<modifier_values, 'modifier_group_id' | 'created_at'>;
    const modifierGroupsWithValues: ModifierGroup[] = modifierGroups.map((mg) => {
      const group: Omit<modifier_groups, 'created_at'> = {
        id: mg.id as string,
        restaurant_id: mg.restaurant_id as string,
        name: mg.name as string,
        required: mg.required as boolean,
        min_selections: mg.min_selections as number,
        max_selections: mg.max_selections as number,
      }
      const values: ModifierValueForGroup[] = modifierValues
        .filter(mv => mv.modifier_group_id === mg.id)
        .map(mv => ({
          id: mv.id as string,
          name: mv.name as string,
          price_adjustment: mv.price_adjustment as number,
          available: mv.available as boolean,
        }))
      return {
        ...group,
        modifier_values: values,
      }
    })

    // Fetch combos (available only)
    const { data: combosData, error: combosError } = await supabase
      .from('combos')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('available', true)

    if (combosError) {
      console.error('Error fetching combos:', combosError)
      return NextResponse.json(
        { error: 'Failed to fetch combos' },
        { status: 500 }
      )
    }
    const combos = combosData as Combo[]

    const response: MenuResponse = {
      categories,
      products: filteredProducts,
      modifier_groups: modifierGroupsWithValues,
      combos
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in /api/menu:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
