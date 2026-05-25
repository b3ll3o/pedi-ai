import { NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface RestaurantResponse {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  settings: string | null;
}

interface ApiListResponse {
  success: boolean;
  data: RestaurantResponse[];
  timestamp: string;
}

export async function GET() {
  try {
    const result = await apiClient.get<ApiListResponse>('/restaurants');

    const response = {
      restaurants: (result.data || []).map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        address: r.address,
        phone: r.phone,
        logo_url: r.logoUrl,
        horarios: r.settings ? JSON.parse(r.settings).horarios : null,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/restaurants:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
