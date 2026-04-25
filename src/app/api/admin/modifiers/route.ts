import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'
import type { modifier_values } from '@/lib/supabase/types'

/**
 * GET /api/admin/modifiers
 * Lista todos os modifier groups do restaurante com seus valores.
 */
export async function GET(_request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const supabase = await createClient()

    // Busca modifier groups do restaurante
    const { data: groups, error } = await supabase
      .from('modifier_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar modifier groups:', error)
      return NextResponse.json(
        { error: 'Falha ao buscar grupos de modificadores' },
        { status: 500 }
      )
    }

    // Busca modifier values para cada grupo
    const groupIds = groups?.map(g => g.id) ?? []
    const valuesMap: Record<string, modifier_values[]> = {}

    if (groupIds.length > 0) {
      const { data: values, error: valuesError } = await supabase
        .from('modifier_values')
        .select('*')
        .in('modifier_group_id', groupIds)
        .order('created_at', { ascending: true })

      if (valuesError) {
        console.error('Erro ao buscar modifier values:', valuesError)
      } else if (values) {
        // Agrupa values por modifier_group_id
        for (const val of values) {
          const modifierGroupId = val.modifier_group_id as string
          if (!valuesMap[modifierGroupId]) {
            valuesMap[modifierGroupId] = []
          }
          valuesMap[modifierGroupId].push({
            id: val.id as string,
            modifier_group_id: modifierGroupId,
            name: val.name as string,
            price_adjustment: val.price_adjustment as number,
            available: val.available as boolean,
            created_at: val.created_at as string,
          })
        }
      }
    }

    // Monta resposta com groups e seus values
    const groupsWithValues = groups?.map(group => ({
      ...group,
      modifier_values: valuesMap[group.id as string] ?? []
    })) ?? []

    return NextResponse.json({ modifier_groups: groupsWithValues })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

/**
 * POST /api/admin/modifiers
 * Cria um novo modifier group para um produto.
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { product_id, name, required, min_selections, max_selections } = body

    // Validações
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    if (product_id) {
      const supabase = await createClient()

      // Valida que o product_id pertence ao restaurante
      // Products não têm restaurant_id diretamente, então verificamos via categoria
      const { data: productWithCategory, error: catError } = await supabase
        .from('products')
        .select('id, categories!inner(restaurant_id)')
        .eq('id', product_id)
        .single()

      if (catError || !productWithCategory) {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        )
      }

      // @ts-expect-error - nested select retorna tipo genérico
      const productRestaurantId = productWithCategory.categories?.restaurant_id
      if (productRestaurantId !== restaurantId) {
        return NextResponse.json(
          { error: 'Produto não pertence a este restaurante' },
          { status: 403 }
        )
      }
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

    if (min_selections !== undefined && max_selections !== undefined && min_selections > max_selections) {
      return NextResponse.json(
        { error: 'min_selections não pode ser maior que max_selections' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: group, error } = await supabase
      .from('modifier_groups')
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        required: required ?? false,
        min_selections: min_selections ?? 0,
        max_selections: max_selections ?? 1
      })
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar modifier group:', error)
      return NextResponse.json(
        { error: 'Falha ao criar grupo de modificadores' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ modifier_group: group }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
