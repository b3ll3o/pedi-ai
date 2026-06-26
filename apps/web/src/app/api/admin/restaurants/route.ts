import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
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
  active: boolean;
  role?: string;
  team_count?: number;
}

export async function GET() {
  try {
    const result = await apiClient.get<ApiResponse<RestaurantData[]>>('/restaurants/user/me');

    return NextResponse.json({ restaurants: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, address, phone, logo_url } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.post<ApiResponse<RestaurantData>>('/restaurants', {
      name: name.trim(),
      description: description?.trim() || undefined,
      address: address?.trim() || undefined,
      phone: phone?.trim() || undefined,
      logoUrl: logo_url || undefined,
    });

    return NextResponse.json({ restaurant: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/restaurants:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
