import { NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

export async function GET() {
  try {
    const user = await apiClient.getMe();

    if (!user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } catch {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
