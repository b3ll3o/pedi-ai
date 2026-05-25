import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface Subscription {
  id: string;
  restaurantId: string;
  status: string;
  planType: string;
  priceCents: number;
  currency: string;
  trialStartedAt: string;
  trialEndsAt: string;
  trialDays: number;
  subscriptionStartedAt: string | null;
  subscriptionEndsAt: string | null;
  cancelledAt: string | null;
  version: number;
  restaurant?: { name: string };
}

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<
      ApiResponse<{ subscription?: Subscription; error?: string }>
    >(`/subscriptions?restaurantId=${restaurantId}`);

    if (result.data.error) {
      return NextResponse.json({ error: result.data.error }, { status: 404 });
    }

    return NextResponse.json({ subscription: result.data.subscription });
  } catch (error) {
    console.error('Error in GET /api/admin/subscriptions:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, plan_type, price_cents } = body;

    if (!restaurant_id || !plan_type) {
      return NextResponse.json(
        { error: 'restaurant_id e plan_type são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await apiClient.post<ApiResponse<{ subscription: Subscription }>>(
      '/subscriptions',
      {
        restaurantId: restaurant_id,
        planType: plan_type,
        priceCents: price_cents,
      }
    );

    return NextResponse.json({ subscription: result.data.subscription });
  } catch (error) {
    console.error('Error in POST /api/admin/subscriptions:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
