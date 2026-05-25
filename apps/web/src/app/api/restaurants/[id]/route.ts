import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiSingleResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface RestaurantData {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  settings: string | null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'ID do restaurante é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiSingleResponse<RestaurantData>>(`/restaurants/${id}`);

    const response = {
      restaurant: {
        id: result.data.id,
        name: result.data.name,
        description: result.data.description,
        address: result.data.address,
        phone: result.data.phone,
        logo_url: result.data.logoUrl,
        horarios: result.data.settings ? JSON.parse(result.data.settings).horarios : null,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in GET /api/restaurants/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
