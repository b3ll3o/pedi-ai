import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface ModifierValue {
  id: string;
  name: string;
  priceAdjustment: number;
  available: boolean;
}

interface ModifierGroup {
  id: string;
  restaurantId: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  modifierValues: ModifierValue[];
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: modifierId } = await params;

    if (!modifierId) {
      return NextResponse.json({ error: 'ID do modificador é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<ModifierGroup>>(
      `/modifier-groups/${modifierId}`
    );

    return NextResponse.json({ modifier: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/modifiers/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: modifierId } = await params;

    if (!modifierId) {
      return NextResponse.json({ error: 'ID do modificador é obrigatório' }, { status: 400 });
    }

    const body = await request.json();
    const { name, min_selections, max_selections, required } = body;

    const result = await apiClient.patch<ApiResponse<ModifierGroup>>(
      `/modifier-groups/${modifierId}`,
      {
        name: name?.trim(),
        minSelections: min_selections,
        maxSelections: max_selections,
        required,
      }
    );

    return NextResponse.json({ modifier: result.data });
  } catch (error) {
    console.error('Error in PUT /api/admin/modifiers/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: modifierId } = await params;

    if (!modifierId) {
      return NextResponse.json({ error: 'ID do modificador é obrigatório' }, { status: 400 });
    }

    await apiClient.delete(`/modifier-groups/${modifierId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/modifiers/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
