import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface PopularItem {
  productId: string;
  productName: string;
  quantity: number;
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10', 10);

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const params = new URLSearchParams({ restaurantId });

    const result = await apiClient.get<ApiResponse<PopularItem[]>>(
      `/analytics/popular-items?${params.toString()}`
    );

    const popular_items = result.data.slice(0, limit).map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      total_quantity: item.quantity,
    }));

    return NextResponse.json({ popular_items });
  } catch (error) {
    console.error('Error in GET /api/admin/analytics/popular-items:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
