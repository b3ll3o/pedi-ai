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

interface QrResponse {
  table: Table;
  qr_url: string;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await apiClient.get<ApiResponse<QrResponse>>(`/tables/${id}/qr`);

    return NextResponse.json({
      table: result.data.table,
      qr_url: result.data.qr_url,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/tables/[id]/qr:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
