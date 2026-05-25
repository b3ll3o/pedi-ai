import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

interface UserProfile {
  id: string;
  userId: string | null;
  restaurantId: string | null;
  role: string;
  name: string;
  email: string;
  createdAt: string;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const result = await apiClient.get<ApiResponse<UserProfile>>(`/users/profiles/${id}`);

    return NextResponse.json({ user: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, role } = body;

    const result = await apiClient.patch<ApiResponse<UserProfile>>(`/users/profiles/${id}`, {
      name,
      email,
      role,
    });

    return NextResponse.json({ user: result.data });
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await apiClient.delete(`/users/profiles/${id}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/admin/users/[id]:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
