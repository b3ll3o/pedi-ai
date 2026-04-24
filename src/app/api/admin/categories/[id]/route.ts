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
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const { id } = await params

    const supabase = await createClient()

    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single()

    if (error || !category) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({ category })
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
    requireRole(authUser, ['owner', 'manager'])

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

    const supabase = await createClient()

    // Verifica ownership
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    const updateData: {
      name?: string;
      description?: string | null;
      sort_order?: number;
      active?: boolean;
    } = {}

    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description
    if (sort_order !== undefined) updateData.sort_order = sort_order
    if (active !== undefined) updateData.active = active

    const { data: category, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar categoria:', error)
      return NextResponse.json(
        { error: 'Falha ao atualizar categoria' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ category })
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
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const { id } = await params

    const supabase = await createClient()

    // Verifica ownership
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    // Soft delete
    const { error } = await supabase
      .from('categories')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir categoria:', error)
      return NextResponse.json(
        { error: 'Falha ao excluir categoria' },
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
