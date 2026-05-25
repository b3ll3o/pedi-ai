import { NextResponse } from 'next/server';

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
  subscriptions: Array<{
    status: string;
    trialEndsAt: string;
  }>;
}

export async function GET() {
  try {
    const result = await apiClient.get<ApiResponse<Restaurant[]>>(
      '/restaurants/user/me/with-trial'
    );

    const restaurants = result.data.map((r) => ({
      ...r,
      subscription_status: r.subscriptions[0]?.status,
      trial_ends_at: r.subscriptions[0]?.trialEndsAt,
    }));

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants/with-trial:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
