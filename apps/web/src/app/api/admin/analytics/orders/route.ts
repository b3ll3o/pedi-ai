import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface OrdersByStatus {
  status: string;
  count: number;
  revenue?: number;
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');
    const startDate = request.nextUrl.searchParams.get('start_date');
    const endDate = request.nextUrl.searchParams.get('end_date');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const params = new URLSearchParams({ restaurantId });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const result = await apiClient.get<ApiResponse<OrdersByStatus[]>>(
      `/analytics/orders-by-status?${params.toString()}`
    );

    return NextResponse.json({ orders: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/analytics/orders:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
