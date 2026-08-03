import { NextRequest, NextResponse } from 'next/server';

import { getApiClient } from '@/lib/api-client';
import { forwardSetCookies } from '@/lib/auth/forward-cookies';

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
    const client = getApiClient(request);
    const result = await client.register(email, senha, nome.trim());

    // O intent não é persistido no user - após login o usuário pode criar restaurante
    // O role padrão é 'cliente' na API

    const response = NextResponse.json(
      {
        success: true,
        user: result.user,
      },
      { status: 201 }
    );
    return forwardSetCookies(response, client.consumeSetCookies());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    console.error('Register error:', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
