import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { categories } from '@/infrastructure/database/schema'
import { eq, and, asc } from 'drizzle-orm'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    if (isDevDatabase()) {
      const conditions = [eq(categories.restaurant_id, restaurantId)]
      if (activeOnly) {
        conditions.push(eq(categories.active, true))
      }
      const result = await db.select().from(categories)
        .where(and(...conditions))
        .orderBy(asc(categories.sort_order))
      return NextResponse.json({ categories: result })
    } else {
      const supabase = getSupabaseAdmin()
      let query = supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)

      if (activeOnly) {
        query = query.eq('active', 'true')
      }

      const { data, error } = await query.order('sort_order', { ascending: true })

      if (error) {
        console.error('Error fetching categories:', error)
        return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
      }

      return NextResponse.json({ categories: data })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { name, sort_order } = body

    // Validações
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório e não pode ser vazio' },
        { status: 400 }
      )
    }

    if (sort_order !== undefined && (typeof sort_order !== 'number' || sort_order < 0)) {
      return NextResponse.json(
        { error: 'sort_order deve ser um número >= 0' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    if (isDevDatabase()) {
      const newCategory = {
        id: crypto.randomUUID(),
        restaurant_id: restaurantId,
        name: name.trim(),
        description: body.description || null,
        sort_order: sort_order ?? 0,
        active: true,
        created_at: now,
        updated_at: now,
      }
      await db.insert(categories).values(newCategory)
      return NextResponse.json({ category: newCategory }, { status: 201 })
    } else {
      const supabase = getSupabaseAdmin()
      const newCategory = {
        id: crypto.randomUUID(),
        restaurant_id: restaurantId,
        name: name.trim(),
        description: body.description || null,
        sort_order: sort_order ?? 0,
        active: true,
        created_at: now,
        updated_at: now,
      }

      const { data, error } = await supabase
        .from('categories')
        .insert(newCategory)
        .select()
        .single()

      if (error) {
        console.error('Error creating category:', error)
        return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
      }

      return NextResponse.json({ category: data }, { status: 201 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
