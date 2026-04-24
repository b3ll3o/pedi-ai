import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const supabase = await createClient()

    let query = supabase
      .from('combos')
      .select(`
        *,
        combo_items(
          *,
          product:products(*)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('available', true)
    }

    const { data: combos, error } = await query

    if (error) {
      console.error('Erro ao buscar combos:', error)
      return NextResponse.json(
        { error: 'Falha ao buscar combos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ combos })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['owner', 'manager'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { name, description, bundle_price, product_ids } = body

    // Validações
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { error: 'Nome é obrigatório e não pode ser vazio' },
        { status: 400 }
      )
    }

    if (bundle_price === undefined || typeof bundle_price !== 'number' || bundle_price < 0) {
      return NextResponse.json(
        { error: 'bundle_price é obrigatório e deve ser um número >= 0' },
        { status: 400 }
      )
    }

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return NextResponse.json(
        { error: 'product_ids é obrigatório e deve ser um array com pelo menos um item' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Validar que todos os product_ids pertencem ao restaurant
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .in('id', product_ids)
      .is('deleted_at', null)

    if (productsError) {
      console.error('Erro ao validar produtos:', productsError)
      return NextResponse.json(
        { error: 'Falha ao validar produtos' },
        { status: 500 }
      )
    }

    const validProductIds = new Set(products?.map(p => p.id) || [])
    const invalidIds = product_ids.filter((id: string) => !validProductIds.has(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Produtos não encontrados ou não pertencem ao restaurante: ${invalidIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Criar combo
    const { data: combo, error: comboError } = await supabase
      .from('combos')
      .insert({
        restaurant_id: restaurantId,
        name: name.trim(),
        description: description || null,
        bundle_price,
        available: true,
      })
      .select()
      .single()

    if (comboError) {
      console.error('Erro ao criar combo:', comboError)
      return NextResponse.json(
        { error: 'Falha ao criar combo' },
        { status: 500 }
      )
    }

    // Criar combo_items
    const comboItemsData = product_ids.map((product_id: string) => ({
      combo_id: combo.id,
      product_id,
      quantity: 1,
    }))

    const { data: items, error: itemsError } = await supabase
      .from('combo_items')
      .insert(comboItemsData)
      .select()

    if (itemsError) {
      console.error('Erro ao criar itens do combo:', itemsError)
      // Rollback: deletar o combo
      await supabase.from('combos').delete().eq('id', combo.id as string)
      return NextResponse.json(
        { error: 'Falha ao criar itens do combo, operação revertida' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ combo, combo_items: items }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
