import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface AnalyticsData {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
}

interface DailyOrder {
  date: string;
  orders: number;
  revenue: number;
}

interface OrdersByStatus {
  status: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const params = new URLSearchParams({ restaurantId });

    const [overviewResult, dailyResult, statusResult] = await Promise.all([
      apiClient.get<ApiResponse<AnalyticsData>>(
        `/analytics/overview-detailed?${params.toString()}`
      ),
      apiClient.get<ApiResponse<DailyOrder[]>>(`/analytics/daily-orders?${params.toString()}`),
      apiClient.get<ApiResponse<OrdersByStatus[]>>(
        `/analytics/orders-by-status?${params.toString()}`
      ),
    ]);

    return NextResponse.json({
      analytics: {
        ...overviewResult.data,
        orders_by_status: statusResult.data,
        daily_orders: dailyResult.data,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/analytics:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
