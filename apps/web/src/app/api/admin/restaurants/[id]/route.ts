import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface RestaurantData {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  active: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json({ error: 'ID do restaurante é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<RestaurantData>>(`/restaurants/${restaurantId}`);

    return NextResponse.json({ restaurant: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/restaurants/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json({ error: 'ID do restaurante é obrigatório' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, address, phone, logo_url } = body;

    const result = await apiClient.patch<ApiResponse<RestaurantData>>(
      `/restaurants/${restaurantId}`,
      {
        name: name?.trim(),
        description: description?.trim(),
        address: address?.trim(),
        phone: phone?.trim(),
        logoUrl: logo_url,
      }
    );

    return NextResponse.json({ restaurant: result.data });
  } catch (error) {
    console.error('Error in PUT /api/admin/restaurants/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json({ error: 'ID do restaurante é obrigatório' }, { status: 400 });
    }

    await apiClient.delete(`/restaurants/${restaurantId}`);

    return NextResponse.json({
      success: true,
      message: 'Restaurante removido com sucesso (soft delete)',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/restaurants/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
