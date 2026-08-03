import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface MenuData {
  categories: Array<{
    id: string;
    restaurantId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
    active: boolean;
  }>;
  products: Array<{
    id: string;
    categoryId: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    price: number;
    available: boolean;
    sortOrder: number;
    dietaryLabels: string[] | null;
  }>;
  modifierGroups: Array<{
    id: string;
    restaurantId: string;
    name: string;
    required: boolean;
    minSelections: number;
    maxSelections: number;
    modifierValues: Array<{
      id: string;
      name: string;
      priceAdjustment: number;
      available: boolean;
    }>;
  }>;
  combos: Array<{
    id: string;
    restaurantId: string;
    name: string;
    description: string | null;
    price: number;
    available: boolean;
  }>;
}

/**
 * Proxy local do endpoint `/menu` da API.
 *
 * A API retorna o payload do cardápio **diretamente**
 * (`{ categories, products, modifierGroups, combos }`), sem wrapper
 * `{ success, data, timestamp }`. Devolvemos o objeto cru para evitar
 * `Value is not JSON serializable` ao tentar serializar `result.data`
 * (undefined) — bug pré-existente em que esta rota proxy retornava 500
 * por tentar serializar `undefined` via `NextResponse.json(result.data)`.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<MenuData>(`/menu?restaurantId=${restaurantId}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro em /api/menu:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
