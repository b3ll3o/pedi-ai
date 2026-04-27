import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

/**
 * PUT /api/admin/modifiers/values/[id]
 * Atualiza um valor de modificador.
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
    const { name, price_adjustment, available } = body

    const supabase = await createClient()

    // Busca o modifier value e verifica ownership via modifier_group
    const { data: existingValue, error: fetchError } = await supabase
      .from('modifier_values')
      .select('id, modifier_group_id, modifier_groups!inner(restaurant_id)')
      .eq('id', id)
      .single()

    if (fetchError || !existingValue) {
      return NextResponse.json(
        { error: 'Valor de modificador não encontrado' },
        { status: 404 }
      )
    }

    // @ts-expect-error - nested select
    const groupRestaurantId = existingValue.modifier_groups?.restaurant_id
    if (groupRestaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Valor de modificador não pertence a este restaurante' },
        { status: 403 }
      )
    }

    // Validações
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return NextResponse.json(
        { error: 'Nome não pode ser vazio' },
        { status: 400 }
      )
    }

    if (price_adjustment !== undefined && typeof price_adjustment !== 'number') {
      return NextResponse.json(
        { error: 'price_adjustment deve ser um número' },
        { status: 400 }
      )
    }

    if (available !== undefined && typeof available !== 'boolean') {
      return NextResponse.json(
        { error: 'available deve ser um booleano' },
        { status: 400 }
      )
    }

    const updateData: {
      name?: string;
      price_adjustment?: number;
      available?: boolean;
    } = {}

    if (name !== undefined) updateData.name = name.trim()
    if (price_adjustment !== undefined) updateData.price_adjustment = price_adjustment
    if (available !== undefined) updateData.available = available

    const { data: value, error } = await supabase
      .from('modifier_values')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar modifier value:', error)
      return NextResponse.json(
        { error: 'Falha ao atualizar valor de modificador' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ modifier_value: value })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * DELETE /api/admin/modifiers/values/[id]
 * Soft delete de um valor de modificador.
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

    // Busca o modifier value e verifica ownership via modifier_group
    const { data: existingValue, error: fetchError } = await supabase
      .from('modifier_values')
      .select('id, modifier_group_id, modifier_groups!inner(restaurant_id)')
      .eq('id', id)
      .single()

    if (fetchError || !existingValue) {
      return NextResponse.json(
        { error: 'Valor de modificador não encontrado' },
        { status: 404 }
      )
    }

    // @ts-expect-error - nested select
    const groupRestaurantId = existingValue.modifier_groups?.restaurant_id
    if (groupRestaurantId !== restaurantId) {
      return NextResponse.json(
        { error: 'Valor de modificador não pertence a este restaurante' },
        { status: 403 }
      )
    }

    // Soft delete do modifier value (atualiza deleted_at se existir)
    const { error } = await supabase
      .from('modifier_values')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir modifier value:', error)
      return NextResponse.json(
        { error: 'Falha ao excluir valor de modificador' },
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
