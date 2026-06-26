import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ModifierValue {
  id: string;
  name: string;
  priceAdjustment: number;
  available: boolean;
}

interface ModifierGroup {
  id: string;
  restaurantId: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  modifierValues: ModifierValue[];
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<ModifierGroup[]>>(
      `/modifier-groups?restaurantId=${restaurantId}`
    );

    return NextResponse.json({ modifiers: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/modifiers:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, name, min_selections, max_selections, required } = body;

    if (!restaurant_id || !name) {
      return NextResponse.json({ error: 'restaurant_id e name são obrigatórios' }, { status: 400 });
    }

    const result = await apiClient.post<ApiResponse<ModifierGroup>>('/modifier-groups', {
      restaurantId: restaurant_id,
      name: name.trim(),
      minSelections: min_selections || 0,
      maxSelections: max_selections || 1,
      required: required || false,
    });

    return NextResponse.json({ modifier: { ...result.data, values: [] } }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/modifiers:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
