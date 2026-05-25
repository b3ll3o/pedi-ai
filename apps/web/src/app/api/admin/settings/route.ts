import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  active: boolean;
  settings: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RestaurantSettings {
  restaurant_id: string;
  config: Record<string, unknown>;
  restaurant_name?: string;
  description?: string;
  opening_hours?: { open: string; close?: string };
  phone?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<Restaurant>>(`/restaurants/${restaurantId}`);

    const settings: RestaurantSettings = {
      restaurant_id: result.data.id,
      config: result.data.settings ? JSON.parse(result.data.settings) : {},
      restaurant_name: result.data.name,
      description: result.data.description ?? undefined,
      phone: result.data.phone ?? undefined,
      address: result.data.address ?? undefined,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error in GET /api/admin/settings:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, config } = body;

    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.patch<ApiResponse<Restaurant>>(`/restaurants/${restaurant_id}`, {
      settings: JSON.stringify(config),
    });

    const settings: RestaurantSettings = {
      restaurant_id: result.data.id,
      config: result.data.settings ? JSON.parse(result.data.settings) : {},
      restaurant_name: result.data.name,
      description: result.data.description ?? undefined,
      phone: result.data.phone ?? undefined,
      address: result.data.address ?? undefined,
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error in PUT /api/admin/settings:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
