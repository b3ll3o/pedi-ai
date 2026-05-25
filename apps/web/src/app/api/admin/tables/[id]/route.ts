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
  number: number | null;
  qrCode: string | null;
  name: string | null;
  capacity: number | null;
  active: boolean;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tableId } = await params;

    if (!tableId) {
      return NextResponse.json({ error: 'ID da mesa é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<Table>>(`/tables/${tableId}`);

    return NextResponse.json({ table: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/tables/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tableId } = await params;

    if (!tableId) {
      return NextResponse.json({ error: 'ID da mesa é obrigatório' }, { status: 400 });
    }

    const body = await request.json();
    const { name, capacity, table_number, active } = body;

    const result = await apiClient.patch<ApiResponse<Table>>(`/tables/${tableId}`, {
      name: name?.trim(),
      number: table_number,
      capacity: capacity,
      active: active,
    });

    return NextResponse.json({ table: result.data });
  } catch (error) {
    console.error('Error in PUT /api/admin/tables/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tableId } = await params;

    if (!tableId) {
      return NextResponse.json({ error: 'ID da mesa é obrigatório' }, { status: 400 });
    }

    await apiClient.delete(`/tables/${tableId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/tables/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
