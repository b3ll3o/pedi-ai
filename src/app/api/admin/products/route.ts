import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('category_id')
    const activeOnly = searchParams.get('active') === 'true'

    const supabase = await createClient()

    // Primeiro busca as categorias do restaurant para filtrar os produtos
    const { data: categories } = await supabase
      .from('categories')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)

    if (!categories || categories.length === 0) {
      return NextResponse.json({ products: [] })
    }

    const categoryIds = categories.map(c => c.id)

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .in('category_id', categoryIds)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (activeOnly) {
      query = query.eq('available', true)
    }

    const { data: products, error } = await query

    if (error) {
      console.error('Erro ao buscar produtos:', error)
      return NextResponse.json(
        { error: 'Falha ao buscar produtos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ products: products || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { name, description, price, category_id, image_url, dietary_labels, available, sort_order } = body

    // Validações
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório e não pode ser vazio' },
        { status: 400 }
      )
    }

    if (price === undefined || typeof price !== 'number' || price <= 0) {
      return NextResponse.json(
        { error: 'Preço deve ser um número maior que 0' },
        { status: 400 }
      )
    }

    if (!category_id || typeof category_id !== 'string') {
      return NextResponse.json(
        { error: 'category_id é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verifica se a categoria existe e pertence ao restaurant
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category_id)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single()

    if (categoryError || !category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada ou não pertence a este restaurante' },
        { status: 404 }
      )
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        category_id,
        name: name.trim(),
        description: description || null,
        image_url: image_url || null,
        price,
        dietary_labels: dietary_labels || null,
        available: available ?? true,
        sort_order: sort_order ?? 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar produto:', error)
      return NextResponse.json(
        { error: 'Falha ao criar produto' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
