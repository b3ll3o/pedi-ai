import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { categories } from '@/infrastructure/database/schema'
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
      const result = await db.select().from(categories).where(
        and(eq(categories.id, id), eq(categories.restaurant_id, restaurantId))
      ).limit(1)

      const category = result[0]
      if (!category) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 404 }
        )
      }
      return NextResponse.json({ category })
    } else {
      const supabase = getSupabaseAdmin()
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching category:', error)
        return NextResponse.json({ error: 'Erro ao buscar categoria' }, { status: 500 })
      }

      if (!data) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 404 }
        )
      }
      return NextResponse.json({ category: data })
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
    const { name, description, sort_order, active } = body

    // Validações
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Nome não pode ser vazio' },
        { status: 400 }
      )
    }

    if (sort_order !== undefined && (typeof sort_order !== 'number' || sort_order < 0)) {
      return NextResponse.json(
        { error: 'sort_order deve ser um número >= 0' },
        { status: 400 }
      )
    }

    if (isDevDatabase()) {
      // Verifica ownership
      const existing = await db.select().from(categories).where(
        and(eq(categories.id, id), eq(categories.restaurant_id, restaurantId))
      ).limit(1)

      if (!existing[0]) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 404 }
        )
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (name !== undefined) updateData.name = name.trim()
      if (description !== undefined) updateData.description = description
      if (sort_order !== undefined) updateData.sort_order = sort_order
      if (active !== undefined) updateData.active = active

      await db.update(categories).set(updateData).where(eq(categories.id, id))

      const updated = await db.select().from(categories).where(eq(categories.id, id)).limit(1)
      await invalidateMenuCache()
      return NextResponse.json({ category: updated[0] })
    } else {
      const supabase = getSupabaseAdmin()

      // Verifica ownership
      const { data: existing, error: fetchError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking category:', fetchError)
        return NextResponse.json({ error: 'Erro ao verificar categoria' }, { status: 500 })
      }

      if (!existing) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 404 }
        )
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (name !== undefined) updateData.name = name.trim()
      if (description !== undefined) updateData.description = description
      if (sort_order !== undefined) updateData.sort_order = sort_order
      if (active !== undefined) updateData.active = active

      const { data, error } = await supabase
        .from('categories')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Error updating category:', error)
        return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 })
      }

      await invalidateMenuCache()
      return NextResponse.json({ category: data })
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
      // Verifica ownership
      const existing = await db.select().from(categories).where(
        and(eq(categories.id, id), eq(categories.restaurant_id, restaurantId))
      ).limit(1)

      if (!existing[0]) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 404 }
        )
      }

      // Hard delete
      await db.delete(categories).where(eq(categories.id, id))
      await invalidateMenuCache()
      return NextResponse.json({ success: true })
    } else {
      const supabase = getSupabaseAdmin()

      // Verifica ownership
      const { data: existing, error: fetchError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking category:', fetchError)
        return NextResponse.json({ error: 'Erro ao verificar categoria' }, { status: 500 })
      }

      if (!existing) {
        return NextResponse.json(
          { error: 'Categoria não encontrada' },
          { status: 404 }
        )
      }

      // Hard delete
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting category:', error)
        return NextResponse.json({ error: 'Erro ao deletar categoria' }, { status: 500 })
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
