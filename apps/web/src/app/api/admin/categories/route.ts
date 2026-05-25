import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface CategoryData {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<CategoryData[]>>(
      `/categories?restaurantId=${restaurantId}`
    );

    return NextResponse.json({ categories: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/categories:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, name, description, position } = body;

    if (!restaurant_id || !name) {
      return NextResponse.json({ error: 'restaurant_id e name são obrigatórios' }, { status: 400 });
    }

    const result = await apiClient.post<ApiResponse<CategoryData>>('/categories', {
      restaurantId: restaurant_id,
      name: name.trim(),
      description: description?.trim() || undefined,
      sortOrder: position,
    });

    return NextResponse.json({ category: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/categories:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
