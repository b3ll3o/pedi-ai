import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface Table {
  id: string;
  restaurantId: string;
  name: string | null;
  number: number;
  capacity: number | null;
  active: boolean;
}

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await apiClient.post<ApiResponse<Table>>(`/tables/${id}/reactivate`, {});

    return NextResponse.json({ table: result.data });
  } catch (error) {
    console.error('Error in POST /api/admin/tables/[id]/reactivate:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
