import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface CategoryData {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: categoryId } = await params;

    if (!categoryId) {
      return NextResponse.json({ error: 'ID da categoria é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<CategoryData>>(`/categories/${categoryId}`);

    return NextResponse.json({ category: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/categories/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: categoryId } = await params;

    if (!categoryId) {
      return NextResponse.json({ error: 'ID da categoria é obrigatório' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, position, active } = body;

    const result = await apiClient.patch<ApiResponse<CategoryData>>(`/categories/${categoryId}`, {
      name: name?.trim(),
      description: description?.trim(),
      sortOrder: position,
      active,
    });

    return NextResponse.json({ category: result.data });
  } catch (error) {
    console.error('Error in PUT /api/admin/categories/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: categoryId } = await params;

    if (!categoryId) {
      return NextResponse.json({ error: 'ID da categoria é obrigatório' }, { status: 400 });
    }

    await apiClient.delete(`/categories/${categoryId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/categories/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
