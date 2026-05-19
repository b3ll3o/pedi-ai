import { NextRequest, NextResponse } from 'next/server';
import { PostgresAuthAdapter } from '@/infrastructure/external/PostgresAuthAdapter';
import { logger } from '@/lib/logger';
import { createSession, createSessionCookie } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha } = body;

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    // Authenticate using PostgresAuthAdapter
    const resultado = await PostgresAuthAdapter.autenticar(email, senha);

    if (!resultado || !resultado.token) {
      return NextResponse.json(
        { error: 'Email ou senha incorretos' },
        { status: 401 }
      );
    }

    const { usuarioId, email: userEmail, role, restaurantId } = resultado;

    // Create session in our database
    const token = await createSession(usuarioId, userEmail, role, restaurantId);

    // Create session cookie
    const sessionCookie = createSessionCookie(token);

    const response = NextResponse.json({
      success: true,
      user: {
        id: usuarioId,
        email: userEmail,
        role,
        restaurantId,
      },
    });

    response.headers.set('Set-Cookie', sessionCookie);
    return response;
  } catch (error) {
    logger.error('auth', 'Unexpected error in /api/auth/login:', { error: error });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
