import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { categories } = body

    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: 'categories deve ser um array' },
        { status: 400 }
      )
    }

    // Valida cada item
    for (const item of categories) {
      if (!item.id || typeof item.id !== 'string') {
        return NextResponse.json(
          { error: 'Cada categoria deve ter um id válido' },
          { status: 400 }
        )
      }
      if (typeof item.sort_order !== 'number' || item.sort_order < 0) {
        return NextResponse.json(
          { error: 'sort_order deve ser um número >= 0' },
          { status: 400 }
        )
      }
    }

    const supabase = await createClient()

    // Atualiza cada categoria com o novo sort_order
    const updates = categories.map((item: { id: string; sort_order: number }) =>
      supabase
        .from('categories')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .eq('restaurant_id', restaurantId)
        .is('deleted_at', null)
    )

    const results = await Promise.all(updates)

    // Verifica se todos updates foram bem-sucedidos
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Erros ao reordenar categorias:', errors)
      return NextResponse.json(
        { error: 'Falha ao reordenar categorias' },
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
