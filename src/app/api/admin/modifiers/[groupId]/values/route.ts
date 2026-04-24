import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

/**
 * POST /api/admin/modifiers/[groupId]/values
 * Adiciona um novo valor de modificador a um grupo.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const { groupId } = await params
    const body = await request.json()
    const { name, price_adjustment } = body

    // Validações
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    if (price_adjustment !== undefined && typeof price_adjustment !== 'number') {
      return NextResponse.json(
        { error: 'price_adjustment deve ser um número' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verifica que o modifier group pertence ao restaurante
    const { data: group, error: groupError } = await supabase
      .from('modifier_groups')
      .select('id')
      .eq('id', groupId)
      .eq('restaurant_id', restaurantId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Grupo de modificadores não encontrado' },
        { status: 404 }
      )
    }

    const { data: value, error } = await supabase
      .from('modifier_values')
      .insert({
        modifier_group_id: groupId,
        name: name.trim(),
        price_adjustment: price_adjustment ?? 0,
        available: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar modifier value:', error)
      return NextResponse.json(
        { error: 'Falha ao criar valor de modificador' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ modifier_value: value }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
