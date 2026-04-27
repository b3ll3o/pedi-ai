import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const { id } = await params

    const supabase = await createClient()

    // Busca o produto com sua categoria
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !product) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Verifica ownership via category
    const category = product.category as { restaurant_id?: string } | null
    if (!category || category.restaurant_id !== restaurantId) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ product })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const { id } = await params
    const body = await request.json()
    const { name, description, price, category_id, image_url, dietary_labels, available, sort_order } = body

    // Validações
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Nome não pode ser vazio' },
        { status: 400 }
      )
    }

    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
      return NextResponse.json(
        { error: 'Preço deve ser um número maior que 0' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Primeiro verifica se o produto existe e pertence ao restaurant
    const { data: existingProduct, error: fetchError } = await supabase
      .from('products')
      .select(`
        id,
        category:categories!inner(restaurant_id)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingProduct) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Verifica ownership
    const existingCategory = existingProduct.category as { restaurant_id?: string }
    if (existingCategory.restaurant_id !== restaurantId) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Verifica se a categoria pertence ao restaurant se category_id for fornecido
    if (category_id) {
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
    if (name !== undefined) updateData.name = name.trim()
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
      console.error('Erro ao atualizar produto:', error)
      return NextResponse.json(
        { error: 'Falha ao atualizar produto' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ product })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const { id } = await params

    const supabase = await createClient()

    // Verifica se o produto existe e pertence ao restaurant
    const { data: existing, error: fetchError } = await supabase
      .from('products')
      .select(`
        id,
        category:categories!inner(restaurant_id)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Verifica ownership
    const existingCategory = existing.category as { restaurant_id?: string }
    if (existingCategory.restaurant_id !== restaurantId) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      )
    }

    // Soft delete
    const { error } = await supabase
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir produto:', error)
      return NextResponse.json(
        { error: 'Falha ao excluir produto' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
