import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha } = body;

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const result = await apiClient.login(email, senha);

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Login error:', message);
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
