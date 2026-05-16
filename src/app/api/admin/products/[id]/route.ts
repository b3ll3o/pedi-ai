import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { products, categories } from '@/infrastructure/database/schema'
import { eq, and } from 'drizzle-orm'
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

    if (isDevDatabase()) {
      // Busca o produto com sua categoria via join usando Drizzle
      const result = await db.select().from(products)
        .leftJoin(categories, eq(products.category_id, categories.id))
        .where(eq(products.id, id))
        .limit(1)

      if (!result[0]) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      const { products: product, categories: category } = result[0]

      // Verifica ownership via category
      if (!category || category.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json({ product })
    } else {
      const supabase = getSupabaseAdmin()

      // Busca o produto com sua categoria via join usando Supabase
      const { data: product, error } = await supabase
        .from('products')
        .select('*, categories(*)')
        .eq('id', id)
        .single()

      if (error || !product) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

       
      const category = product.categories as { restaurant_id: string } | null
      if (!category || category.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json({ product })
    }
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

    if (isDevDatabase()) {
      // Primeiro verifica se o produto existe e pertence ao restaurant usando Drizzle
      const existing = await db.select().from(products)
        .leftJoin(categories, eq(products.category_id, categories.id))
        .where(eq(products.id, id))
        .limit(1)

      if (!existing[0]) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      const { categories: existingCategory } = existing[0]

      // Verifica ownership
      if (!existingCategory || existingCategory.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      // Verifica se a categoria pertence ao restaurant se category_id for fornecido
      if (category_id) {
        const catResult = await db.select().from(categories)
          .where(and(eq(categories.id, category_id), eq(categories.restaurant_id, restaurantId)))
          .limit(1)
        if (!catResult[0]) {
          return NextResponse.json(
            { error: 'Categoria não encontrada ou não pertence a este restaurante' },
            { status: 404 }
          )
        }
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (category_id !== undefined) updateData.category_id = category_id
      if (name !== undefined) updateData.name = name.trim()
      if (description !== undefined) updateData.description = description
      if (image_url !== undefined) updateData.image_url = image_url
      if (price !== undefined) updateData.price = price
      if (dietary_labels !== undefined) updateData.dietary_labels = dietary_labels
      if (available !== undefined) updateData.available = available
      if (sort_order !== undefined) updateData.sort_order = sort_order

      await db.update(products).set(updateData).where(eq(products.id, id))

      const updated = await db.select().from(products).where(eq(products.id, id)).limit(1)
      await invalidateMenuCache()
      return NextResponse.json({ product: updated[0] })
    } else {
      const supabase = getSupabaseAdmin()

      // Primeiro verifica se o produto existe e pertence ao restaurant usando Supabase
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('*, categories!inner(restaurant_id)')
        .eq('id', id)
        .single()

      if (fetchError || !existingProduct) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

       
      const existingCategory = existingProduct.categories as { restaurant_id: string } | null
      if (!existingCategory || existingCategory.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      // Verifica se a categoria pertence ao restaurant se category_id for fornecido
      if (category_id) {
        const { data: catResult, error: catError } = await supabase
          .from('categories')
          .select('id')
          .eq('id', category_id)
          .eq('restaurant_id', restaurantId)
          .single()

        if (catError || !catResult) {
          return NextResponse.json(
            { error: 'Categoria não encontrada ou não pertence a este restaurante' },
            { status: 404 }
          )
        }
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (category_id !== undefined) updateData.category_id = category_id
      if (name !== undefined) updateData.name = name.trim()
      if (description !== undefined) updateData.description = description
      if (image_url !== undefined) updateData.image_url = image_url
      if (price !== undefined) updateData.price = price
      if (dietary_labels !== undefined) updateData.dietary_labels = dietary_labels
      if (available !== undefined) updateData.available = available
      if (sort_order !== undefined) updateData.sort_order = sort_order

      const { data: updated, error: updateError } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating product:', updateError)
        return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 })
      }

      await invalidateMenuCache()
      return NextResponse.json({ product: updated })
    }
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

    if (isDevDatabase()) {
      // Verifica se o produto existe e pertence ao restaurant usando Drizzle
      const existing = await db.select().from(products)
        .leftJoin(categories, eq(products.category_id, categories.id))
        .where(eq(products.id, id))
        .limit(1)

      if (!existing[0]) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      const { categories: existingCategory } = existing[0]

      // Verifica ownership
      if (!existingCategory || existingCategory.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      // Hard delete
      await db.delete(products).where(eq(products.id, id))
      await invalidateMenuCache()
      return NextResponse.json({ success: true })
    } else {
      const supabase = getSupabaseAdmin()

      // Verifica se o produto existe e pertence ao restaurant usando Supabase
      const { data: existingProduct, error: fetchError } = await supabase
        .from('products')
        .select('*, categories!inner(restaurant_id)')
        .eq('id', id)
        .single()

      if (fetchError || !existingProduct) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

       
      const existingCategory = existingProduct.categories as { restaurant_id: string } | null
      if (!existingCategory || existingCategory.restaurant_id !== restaurantId) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting product:', deleteError)
        return NextResponse.json({ error: 'Erro ao deletar produto' }, { status: 500 })
      }

      await invalidateMenuCache()
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
