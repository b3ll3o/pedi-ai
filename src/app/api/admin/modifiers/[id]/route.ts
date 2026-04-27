import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

/**
 * GET /api/admin/modifiers/[id]
 * Retorna um modifier group específico com seus valores.
 */
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

    // Fetch modifier group
    const { data: group, error: groupError } = await supabase
      .from('modifier_groups')
      .select('*')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Grupo de modificadores não encontrado' },
        { status: 404 }
      )
    }

    // Fetch modifier values
    const { data: values, error: valuesError } = await supabase
      .from('modifier_values')
      .select('*')
      .eq('modifier_group_id', id)
      .order('created_at', { ascending: true })

    if (valuesError) {
      console.error('Erro ao buscar modifier values:', valuesError)
      return NextResponse.json(
        { error: 'Falha ao buscar valores de modificadores' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      modifier_group: group,
      modifier_values: values ?? []
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * PUT /api/admin/modifiers/[id]
 * Atualiza um modifier group.
 */
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
    const { name, required, min_selections, max_selections } = body

    const supabase = await createClient()

    // Verifica modifier group existe e pertence ao restaurante
    const { data: existing, error: fetchError } = await supabase
      .from('modifier_groups')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Grupo de modificadores não encontrado' },
        { status: 404 }
      )
    }

    // Validações
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Nome não pode ser vazio' },
        { status: 400 }
      )
    }

    if (min_selections !== undefined && (typeof min_selections !== 'number' || min_selections < 0)) {
      return NextResponse.json(
        { error: 'min_selections deve ser um número >= 0' },
        { status: 400 }
      )
    }

    if (max_selections !== undefined && (typeof max_selections !== 'number' || max_selections < 1)) {
      return NextResponse.json(
        { error: 'max_selections deve ser um número >= 1' },
        { status: 400 }
      )
    }

    // Valida range se ambos fornecidos
    const currentMin = min_selections ?? 0
    const currentMax = max_selections ?? 1
    if (min_selections !== undefined && max_selections !== undefined && currentMin > currentMax) {
      return NextResponse.json(
        { error: 'min_selections não pode ser maior que max_selections' },
        { status: 400 }
      )
    }

    const updateData: {
      name?: string;
      required?: boolean;
      min_selections?: number;
      max_selections?: number;
    } = {}

    if (name !== undefined) updateData.name = name.trim()
    if (required !== undefined) updateData.required = required
    if (min_selections !== undefined) updateData.min_selections = min_selections
    if (max_selections !== undefined) updateData.max_selections = max_selections

    const { data: group, error } = await supabase
      .from('modifier_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar modifier group:', error)
      return NextResponse.json(
        { error: 'Falha ao atualizar grupo de modificadores' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ modifier_group: group })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * DELETE /api/admin/modifiers/[id]
 * Soft delete de um modifier group.
 */
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

    // Verifica modifier group existe e pertence ao restaurante
    const { data: existing, error: fetchError } = await supabase
      .from('modifier_groups')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Grupo de modificadores não encontrado' },
        { status: 404 }
      )
    }

    // Soft delete do modifier group (atualiza deleted_at)
    const { error } = await supabase
      .from('modifier_groups')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir modifier group:', error)
      return NextResponse.json(
        { error: 'Falha ao excluir grupo de modificadores' },
        { status: 500 }
      )
    }

    // Soft delete nos modifier values associados
    const { error: valuesError } = await supabase
      .from('modifier_values')
      .update({ deleted_at: new Date().toISOString() })
      .eq('modifier_group_id', id)

    if (valuesError) {
      console.error('Erro ao excluir modifier values:', valuesError)
    }

    await invalidateMenuCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
