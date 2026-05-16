import { NextRequest, NextResponse } from 'next/server'
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database'
import { restaurants } from '@/infrastructure/database/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

export interface RestaurantSettings {
  restaurant_name: string
  description: string
  opening_hours: {
    open: string
    close: string
  }
  phone: string
  address: string
}

// GET /api/admin/settings - Get restaurant settings
export async function GET(_request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono'])

    const restaurantId = getRestaurantId(authUser)

    if (isDevDatabase()) {
      const result = await db
        .select({
          name: restaurants.name,
          description: restaurants.description,
          phone: restaurants.phone,
          address: restaurants.address,
          settings: restaurants.settings,
        })
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1)

      const restaurant = result[0]
      if (!restaurant) {
        return NextResponse.json(
          { error: 'Restaurante não encontrado' },
          { status: 404 }
        )
      }

      // Parse settings for opening hours
      const settings = (restaurant.settings as Record<string, unknown>) || {}
      const openingHours = (settings.opening_hours as { open?: string; close?: string }) || { open: '08:00', close: '22:00' }

      const response: RestaurantSettings = {
        restaurant_name: restaurant.name,
        description: restaurant.description || '',
        opening_hours: {
          open: openingHours.open || '08:00',
          close: openingHours.close || '22:00',
        },
        phone: restaurant.phone || '',
        address: restaurant.address || '',
      }

      return NextResponse.json(response)
    } else {
      const supabase = getSupabaseAdmin()

      const { data: restaurant, error } = await supabase
        .from('restaurants')
        .select('name, description, phone, address, settings')
        .eq('id', restaurantId)
        .single()

      if (error) {
        console.error('Error fetching restaurant settings:', error)
        return NextResponse.json(
          { error: 'Falha ao carregar configurações' },
          { status: 500 }
        )
      }

      if (!restaurant) {
        return NextResponse.json(
          { error: 'Restaurante não encontrado' },
          { status: 404 }
        )
      }

      // Parse settings for opening hours
      const settings = (restaurant.settings as Record<string, unknown>) || {}
      const openingHours = (settings.opening_hours as { open?: string; close?: string }) || { open: '08:00', close: '22:00' }

      const response: RestaurantSettings = {
        restaurant_name: restaurant.name,
        description: restaurant.description || '',
        opening_hours: {
          open: openingHours.open || '08:00',
          close: openingHours.close || '22:00',
        },
        phone: restaurant.phone || '',
        address: restaurant.address || '',
      }

      return NextResponse.json(response)
    }
  } catch (error) {
    console.error('Unexpected error in /api/admin/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/settings - Update restaurant settings
export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    requireRole(authUser, ['dono'])

    const restaurantId = getRestaurantId(authUser)
    const body = await request.json()
    const { restaurant_name, description, opening_hours, phone, address } = body

    if (isDevDatabase()) {
      // First get current restaurant data to merge with settings
      const currentResult = await db
        .select({ settings: restaurants.settings })
        .from(restaurants)
        .where(eq(restaurants.id, restaurantId))
        .limit(1)

      if (!currentResult[0]) {
        return NextResponse.json(
          { error: 'Falha ao carregar restaurante' },
          { status: 500 }
        )
      }

      const currentSettings = ((currentResult[0].settings as Record<string, unknown>) || {}) as Record<string, unknown>

      // Update restaurant basic info
      await db
        .update(restaurants)
        .set({
          name: restaurant_name,
          description: description || null,
          phone: phone || null,
          address: address || null,
          settings: {
            ...currentSettings,
            opening_hours: opening_hours || { open: '08:00', close: '22:00' },
          },
          updated_at: new Date().toISOString(),
        })
        .where(eq(restaurants.id, restaurantId))

      return NextResponse.json({ message: 'Configurações atualizadas com sucesso' })
    } else {
      const supabase = getSupabaseAdmin()

      // First get current restaurant data to merge with settings
      const { data: currentRestaurant, error: fetchError } = await supabase
        .from('restaurants')
        .select('settings')
        .eq('id', restaurantId)
        .single()

      if (fetchError) {
        console.error('Error fetching current restaurant:', fetchError)
        return NextResponse.json(
          { error: 'Falha ao carregar restaurante' },
          { status: 500 }
        )
      }

      const currentSettings = ((currentRestaurant?.settings as Record<string, unknown>) || {}) as Record<string, unknown>

      // Update restaurant basic info
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({
          name: restaurant_name,
          description: description || null,
          phone: phone || null,
          address: address || null,
          settings: {
            ...currentSettings,
            opening_hours: opening_hours || { open: '08:00', close: '22:00' },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', restaurantId)

      if (updateError) {
        console.error('Error updating restaurant settings:', updateError)
        return NextResponse.json(
          { error: 'Falha ao atualizar configurações' },
          { status: 500 }
        )
      }

      return NextResponse.json({ message: 'Configurações atualizadas com sucesso' })
    }
  } catch (error) {
    console.error('Unexpected error in /api/admin/settings PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}