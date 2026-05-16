import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { categories } from '@/infrastructure/database/schema'
import { eq, and } from 'drizzle-orm'
import { invalidateMenuCache } from '@/lib/offline/cache'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono', 'gerente'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { categories: categoryList } = body

    if (!Array.isArray(categoryList)) {
      return NextResponse.json(
        { error: 'categories deve ser um array' },
        { status: 400 }
      )
    }

    // Valida cada item
    for (const item of categoryList) {
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

    if (isDevDatabase()) {
      // Atualiza cada categoria com o novo sort_order usando Drizzle
      for (const item of categoryList) {
        await db.update(categories)
          .set({ sort_order: item.sort_order })
          .where(and(eq(categories.id, item.id), eq(categories.restaurant_id, restaurantId)))
      }
      await invalidateMenuCache()
      return NextResponse.json({ success: true })
    } else {
      const supabase = getSupabaseAdmin()

      // Atualiza cada categoria com o novo sort_order usando Supabase
      for (const item of categoryList) {
        const { error } = await supabase
          .from('categories')
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
          .eq('restaurant_id', restaurantId)

        if (error) {
          console.error('Error updating category sort_order:', error)
          return NextResponse.json(
            { error: 'Erro ao atualizar ordem das categorias' },
            { status: 500 }
          )
        }
      }
      await invalidateMenuCache()
      return NextResponse.json({ success: true })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno'
    const status = (error as Error & { status?: number }).status || 500
    return NextResponse.json({ error: message }, { status })
  }
}
