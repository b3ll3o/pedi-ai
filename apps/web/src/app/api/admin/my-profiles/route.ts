import { NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

interface UserProfilesResponse {
  profiles: unknown[];
}

export async function GET() {
  try {
    const result = await apiClient.get<UserProfilesResponse>('/restaurants/user/me');
    return NextResponse.json({ profiles: result.profiles });
  } catch (error) {
    console.error('Error in GET /api/admin/my-profiles:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
