import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ProductData {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  dietaryLabels: string | null;
  available: boolean;
  sortOrder: number;
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<ProductData[]>>(
      `/products?restaurantId=${restaurantId}`
    );

    return NextResponse.json({ products: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/products:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, category_id, name, description, price_cents, image_url } = body;

    if (!restaurant_id || !name || price_cents === undefined) {
      return NextResponse.json(
        { error: 'restaurant_id, name e price_cents são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await apiClient.post<ApiResponse<ProductData>>('/products/with-restaurant', {
      categoryId: category_id || undefined,
      restaurantId: restaurant_id,
      name: name.trim(),
      description: description?.trim() || undefined,
      imageUrl: image_url || undefined,
      price: price_cents,
      sortOrder: 0,
    });

    return NextResponse.json({ product: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/products:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
