import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db, isDevDatabase } from '@/infrastructure/database'
import { combos, comboItems, products } from '@/infrastructure/database/schema'
import { eq, and, inArray } from 'drizzle-orm'
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
      const comboResult = await db
        .select()
        .from(combos)
        .where(and(eq(combos.id, id), eq(combos.restaurant_id, restaurantId)))
        .limit(1)
        .get()

      if (!comboResult) {
        return NextResponse.json(
          { error: 'Combo não encontrado' },
          { status: 404 }
        )
      }

      // Get combo items
      const itemsResult = await db
        .select({
          id: comboItems.id,
          combo_id: comboItems.combo_id,
          product_id: comboItems.product_id,
          quantity: comboItems.quantity,
          created_at: comboItems.created_at,
        })
        .from(comboItems)
        .where(eq(comboItems.combo_id, id))

      return NextResponse.json({ combo: { ...comboResult, combo_items: itemsResult } })
    }

    // Production: use Supabase
    const supabase = await createClient()

    const { data: combo, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (error || !combo) {
      return NextResponse.json(
        { error: 'Combo não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({ combo })
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
    const { name, description, bundle_price, available, product_ids } = body

    if (isDevDatabase()) {
      // Verificar se o combo existe e pertence ao restaurant
      const existingCombo = await db
        .select({ id: combos.id })
        .from(combos)
        .where(and(eq(combos.id, id), eq(combos.restaurant_id, restaurantId)))
        .limit(1)
        .get()

      if (!existingCombo) {
        return NextResponse.json(
          { error: 'Combo não encontrado' },
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

      if (bundle_price !== undefined && (typeof bundle_price !== 'number' || bundle_price < 0)) {
        return NextResponse.json(
          { error: 'bundle_price deve ser um número >= 0' },
          { status: 400 }
        )
      }

      // Atualizar campos do combo
      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name.trim()
      if (description !== undefined) updateData.description = description
      if (bundle_price !== undefined) updateData.bundle_price = bundle_price
      if (available !== undefined) updateData.available = available

      if (Object.keys(updateData).length > 0) {
        await db.update(combos).set(updateData).where(eq(combos.id, id))
      }

      // Atualizar combo_items se product_ids fornecido
      if (product_ids !== undefined) {
        // Deletar itens existentes
        await db.delete(comboItems).where(eq(comboItems.combo_id, id))

        // Inserir novos itens
        if (product_ids.length > 0) {
          const now = new Date().toISOString()
          const newItems = product_ids.map((product_id: string) => ({
            id: crypto.randomUUID(),
            combo_id: id,
            product_id,
            quantity: 1,
            created_at: now,
          }))

          await db.insert(comboItems).values(newItems)
        }
      }

      // Buscar combo atualizado
      const updatedCombo = await db
        .select()
        .from(combos)
        .where(eq(combos.id, id))
        .limit(1)
        .get()

      const itemsResult = await db
        .select({
          id: comboItems.id,
          combo_id: comboItems.combo_id,
          product_id: comboItems.product_id,
          quantity: comboItems.quantity,
          created_at: comboItems.created_at,
        })
        .from(comboItems)
        .where(eq(comboItems.combo_id, id))

      await invalidateMenuCache()
      return NextResponse.json({ combo: { ...updatedCombo, combo_items: itemsResult } })
    }

    // Production: use Supabase
    const supabase = await createClient()

    // Verificar se o combo existe e pertence ao restaurant
    const { data: existing, error: fetchError } = await supabase
      .from('combos')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Combo não encontrado' },
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

    if (bundle_price !== undefined && (typeof bundle_price !== 'number' || bundle_price < 0)) {
      return NextResponse.json(
        { error: 'bundle_price deve ser um número >= 0' },
        { status: 400 }
      )
    }

    // Validar product_ids se fornecido
    if (product_ids !== undefined) {
      if (!Array.isArray(product_ids) || product_ids.length === 0) {
        return NextResponse.json(
          { error: 'product_ids deve ser um array com pelo menos um item' },
          { status: 400 }
        )
      }

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .in('id', product_ids)

      if (productsError) {
        console.error('Erro ao validar produtos:', productsError)
        return NextResponse.json(
          { error: 'Falha ao validar produtos' },
          { status: 500 }
        )
      }

      const validProductIds = new Set(productsData?.map(p => p.id) || [])
      const invalidIds = product_ids.filter((pid: string) => !validProductIds.has(pid))

      if (invalidIds.length > 0) {
        return NextResponse.json(
          { error: `Produtos não encontrados ou não pertencem ao restaurante: ${invalidIds.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Atualizar campos do combo
    const updateData: { name?: string; description?: string | null; bundle_price?: number; available?: boolean } = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description
    if (bundle_price !== undefined) updateData.bundle_price = bundle_price
    if (available !== undefined) updateData.available = available

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('combos')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(updateData as any)
        .eq('id', id)

      if (updateError) {
        console.error('Erro ao atualizar combo:', updateError)
        return NextResponse.json(
          { error: 'Falha ao atualizar combo' },
          { status: 500 }
        )
      }
    }

    // Atualizar combo_items se product_ids fornecido
    if (product_ids !== undefined) {
      // Deletar itens existentes
      await supabase.from('combo_items').delete().eq('combo_id', id)

      // Inserir novos itens
      if (product_ids.length > 0) {
        const comboItemsData = product_ids.map((product_id: string) => ({
          combo_id: id,
          product_id,
          quantity: 1,
        }))

        const { error: itemsError } = await supabase
          .from('combo_items')
          .insert(comboItemsData)

        if (itemsError) {
          console.error('Erro ao atualizar itens do combo:', itemsError)
          return NextResponse.json(
            { error: 'Falha ao atualizar itens do combo' },
            { status: 500 }
          )
        }
      }
    }

    // Buscar combo atualizado com itens
    const { data: updatedCombo, error: fetchUpdatedError } = await supabase
      .from('combos')
      .select(`
        *,
        combo_items(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .single()

    if (fetchUpdatedError) {
      console.error('Erro ao buscar combo atualizado:', fetchUpdatedError)
      return NextResponse.json(
        { error: 'Falha ao buscar combo atualizado' },
        { status: 500 }
      )
    }

    await invalidateMenuCache()
    return NextResponse.json({ combo: updatedCombo })
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
      // Verificar se o combo existe e pertence ao restaurant
      const existingCombo = await db
        .select({ id: combos.id })
        .from(combos)
        .where(and(eq(combos.id, id), eq(combos.restaurant_id, restaurantId)))
        .limit(1)
        .get()

      if (!existingCombo) {
        return NextResponse.json(
          { error: 'Combo não encontrado' },
          { status: 404 }
        )
      }

      // Soft delete - definir available = false
      await db.update(combos).set({ available: false }).where(eq(combos.id, id))

      await invalidateMenuCache()
      return NextResponse.json({ success: true })
    }

    // Production: use Supabase
    const supabase = await createClient()

    // Verificar se o combo existe e pertence ao restaurant
    const { data: existing, error: fetchError } = await supabase
      .from('combos')
      .select('id')
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Combo não encontrado' },
        { status: 404 }
      )
    }

    // Soft delete - definir deleted_at
    const { error: deleteError } = await supabase
      .from('combos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      console.error('Erro ao deletar combo:', deleteError)
      return NextResponse.json(
        { error: 'Falha ao deletar combo' },
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
