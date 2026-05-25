import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ModifierValue {
  id: string;
  modifierGroupId: string;
  name: string;
  priceAdjustment: number;
  available: boolean;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await apiClient.get<ApiResponse<ModifierValue>>(`/modifier-groups/values/${id}`);

    return NextResponse.json({ value: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/modifiers/values/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, price_cents, available } = body;

    const result = await apiClient.patch<ApiResponse<ModifierValue>>(
      `/modifier-groups/values/${id}`,
      {
        name,
        priceAdjustment: price_cents,
        available,
      }
    );

    return NextResponse.json({ value: result.data });
  } catch (error) {
    console.error('Error in PATCH /api/admin/modifiers/values/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await apiClient.delete(`/modifier-groups/values/${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/modifiers/values/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
