import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const supabase = await createClient()

    let query = supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (activeOnly) {
      query = query.eq('active', true)
    }

    const { data: categories, error } = await query

    if (error) {
      console.error('Erro ao buscar categorias:', error)
      return NextResponse.json(
        { error: 'Falha ao buscar categorias' },
        { status: 500 }
      )
    }

    return NextResponse.json({ categories })
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

    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        description: body.description || null,
        sort_order: sort_order ?? 0,
        active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar categoria:', error)
      return NextResponse.json(
        { error: 'Falha ao criar categoria' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
