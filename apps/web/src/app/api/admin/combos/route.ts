import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ComboItem {
  id: string;
  productId: string;
  quantity: number;
}

interface Combo {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  items: ComboItem[];
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<Combo[]>>(
      `/combos?restaurantId=${restaurantId}`
    );

    return NextResponse.json({ combos: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/combos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, name, description, price_cents, active, items } = body;

    if (!restaurant_id || !name || price_cents === undefined) {
      return NextResponse.json(
        { error: 'restaurant_id, name e price_cents são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await apiClient.post<ApiResponse<Combo>>('/combos', {
      restaurantId: restaurant_id,
      name: name.trim(),
      description: description?.trim() || null,
      price: price_cents,
      available: active !== false,
      items: items
        ? items.map((i: { product_id: string; quantity?: number }) => ({
            productId: i.product_id,
            quantity: i.quantity || 1,
          }))
        : [],
    });

    return NextResponse.json({ combo: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/combos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
