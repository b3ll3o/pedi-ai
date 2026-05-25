import { NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

export async function GET() {
  try {
    const result = await apiClient.get('/restaurants/user/me');
    return NextResponse.json({ profiles: result.data });
  } catch (error) {
    console.error('Error in GET /api/admin/my-profiles:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
