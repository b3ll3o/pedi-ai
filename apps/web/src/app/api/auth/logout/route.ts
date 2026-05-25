import { NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

export async function POST() {
  try {
    await apiClient.logout();

    const response = NextResponse.json({ success: true });
    response.headers.set(
      'Set-Cookie',
      'access_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'
    );
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Erro ao fazer logout' }, { status: 500 });
  }
}
