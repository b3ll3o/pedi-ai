import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ComboItem {
  id: string;
  productId: string;
  quantity: number;
}

interface Combo {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  price: number;
  available: boolean;
  items: ComboItem[];
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: comboId } = await params;

    if (!comboId) {
      return NextResponse.json({ error: 'ID do combo é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<Combo>>(`/combos/${comboId}`);

    return NextResponse.json({ combo: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/combos/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: comboId } = await params;

    if (!comboId) {
      return NextResponse.json({ error: 'ID do combo é obrigatório' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, price_cents, active, items } = body;

    const result = await apiClient.patch<ApiResponse<Combo>>(`/combos/${comboId}`, {
      name: name?.trim(),
      description: description?.trim(),
      price: price_cents,
      available: active,
    });

    return NextResponse.json({ combo: result.data });
  } catch (error) {
    console.error('Error in PUT /api/admin/combos/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: comboId } = await params;

    if (!comboId) {
      return NextResponse.json({ error: 'ID do combo é obrigatório' }, { status: 400 });
    }

    await apiClient.delete(`/combos/${comboId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/combos/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
