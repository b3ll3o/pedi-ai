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

export async function GET(request: NextRequest) {
  try {
    const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id é obrigatório' }, { status: 400 });
    }

    const result = await apiClient.get<ApiResponse<UserProfile[]>>(
      `/users/profiles?restaurantId=${restaurantId}`
    );

    return NextResponse.json({ users: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurant_id, email, name, role } = body;

    if (!restaurant_id || !email || !name || !role) {
      return NextResponse.json(
        { error: 'restaurant_id, email, name e role são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await apiClient.post<ApiResponse<UserProfile>>('/users/profiles', {
      restaurantId: restaurant_id,
      email,
      name,
      role,
    });

    return NextResponse.json({ user: result.data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/users:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
