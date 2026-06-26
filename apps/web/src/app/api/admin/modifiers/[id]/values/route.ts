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
  position?: number;
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
    const { id } = await params;

    const result = await apiClient.get<ApiResponse<ModifierGroup>>(`/modifier-groups/${id}`);

    return NextResponse.json({ values: result.data.modifierValues || [] });
  } catch (error) {
    console.error('Error in GET /api/admin/modifiers/[id]/values:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, price_cents } = body;

    const result = await apiClient.post<ApiResponse<ModifierValue>>(
      `/modifier-groups/${id}/values`,
      {
        name,
        priceAdjustment: price_cents || 0,
      }
    );

    return NextResponse.json({ value: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/modifiers/[id]/values:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
