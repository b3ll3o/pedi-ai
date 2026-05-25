import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface Order {
  id: string;
  restaurantId: string;
  status: string;
  history?: Array<{
    id: string;
    orderId: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }>;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: 'status é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.patch<ApiResponse<Order>>(`/orders/${id}/status`, {
      status,
      notes,
    });

    return NextResponse.json({
      order: { ...result.data, history: result.data.history || [] },
    });
  } catch (error) {
    console.error('Error in POST /api/admin/orders/[id]/status:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
