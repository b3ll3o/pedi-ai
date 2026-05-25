import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha, intent, nome } = body;

    if (!email || !senha || !intent) {
      return NextResponse.json(
        { error: 'email, senha e intent são obrigatórios' },
        { status: 400 }
      );
    }

    if (!nome || nome.trim().length === 0) {
      return NextResponse.json({ error: 'nome é obrigatório' }, { status: 400 });
    }

    if (intent !== 'gerenciar_restaurante' && intent !== 'fazer_pedidos') {
      return NextResponse.json(
        { error: 'intent inválido. Use: gerenciar_restaurante ou fazer_pedidos' },
        { status: 400 }
      );
    }

    // Registrar usuário na API (retorna access_token, refresh_token, user)
    const result = await apiClient.register(email, senha, nome.trim());

    // O intent não é persistido no user - após login o usuário pode criar restaurante
    // O role padrão é 'cliente' na API

    return NextResponse.json(
      {
        success: true,
        user: result.user,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Register error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
