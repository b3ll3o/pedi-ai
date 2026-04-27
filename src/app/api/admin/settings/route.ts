import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'
import type { restaurants } from '@/lib/supabase/types'

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
    const supabase = await createClient()

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

    // Cast to access typed properties
    const typedRestaurant = restaurant as unknown as {
      name: string
      description: string | null
      phone: string | null
      address: string | null
      settings: Record<string, unknown> | null
    }

    // Parse settings for opening hours
    const settings = typedRestaurant.settings || {}
    const openingHours = (settings.opening_hours as { open?: string; close?: string }) || { open: '08:00', close: '22:00' }

    const response: RestaurantSettings = {
      restaurant_name: typedRestaurant.name,
      description: typedRestaurant.description || '',
      opening_hours: {
        open: openingHours.open || '08:00',
        close: openingHours.close || '22:00',
      },
      phone: typedRestaurant.phone || '',
      address: typedRestaurant.address || '',
    }

    return NextResponse.json(response)
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

    const supabase = await createClient()

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

    const currentSettings = ((currentRestaurant as restaurants & { settings?: Record<string, unknown> })?.settings || {}) as Record<string, unknown>

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
  } catch (error) {
    console.error('Unexpected error in /api/admin/settings PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}