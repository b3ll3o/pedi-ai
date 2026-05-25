import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: restaurantId } = await params;

    if (!restaurantId) {
      return NextResponse.json({ error: 'ID do restaurante é obrigatório' }, { status: 400 });
    }

    await apiClient.patch(`/restaurants/${restaurantId}`, { active: false });

    return NextResponse.json({
      success: true,
      message: 'Restaurante desativado com sucesso',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/restaurants/[id]/deactivate:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
