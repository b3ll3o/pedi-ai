import { NextRequest, NextResponse } from 'next/server';
import { PostgresAuthAdapter } from '@/infrastructure/external/PostgresAuthAdapter';
import { logger } from '@/lib/logger';
import { sql } from '@/infrastructure/database/pg-client';
import { createSession, createSessionCookie } from '@/lib/auth/session';

type Intent = 'gerenciar_restaurante' | 'fazer_pedidos';
type Role = 'dono' | 'cliente';

function intentToRole(intent: Intent): Role {
  return intent === 'gerenciar_restaurante' ? 'dono' : 'cliente';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha, intent } = body;

    if (!email || !senha || !intent) {
      return NextResponse.json({ error: 'email, senha e intent são obrigatórios' }, { status: 400 });
    }

    if (intent !== 'gerenciar_restaurante' && intent !== 'fazer_pedidos') {
      return NextResponse.json(
        { error: 'intent inválido. Use: gerenciar_restaurante ou fazer_pedidos' },
        { status: 400 }
      );
    }

    // Create user using PostgresAuthAdapter
    const resultado = await PostgresAuthAdapter.criarUsuario(email, senha);

    if (!resultado || !resultado.id) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário' },
        { status: 400 }
      );
    }

    const { id: usuarioId } = resultado;
    const role: Role = intentToRole(intent);

    // Check if profile already exists
    const existingProfile = await sql`
      SELECT id FROM users_profiles WHERE user_id = ${usuarioId} LIMIT 1
    `;

    if (existingProfile.length > 0) {
      // Already has profile, just create session
      const token = await createSession(usuarioId, email.toLowerCase(), role, undefined);
      const sessionCookie = createSessionCookie(token);

      const response = NextResponse.json({ success: true });
      response.headers.set('Set-Cookie', sessionCookie);
      return response;
    }

    // Create user profile
    const profileId = crypto.randomUUID();
    const now = new Date().toISOString();

    await sql`
      INSERT INTO users_profiles (id, user_id, email, role, name, restaurant_id, created_at)
      VALUES (
        ${profileId},
        ${usuarioId},
        ${email.toLowerCase()},
        ${role},
        ${''},
        NULL,
        ${now}
      )
    `;

    // Create session
    const token = await createSession(usuarioId, email.toLowerCase(), role, undefined);
    const sessionCookie = createSessionCookie(token);

    const response = NextResponse.json({ success: true }, { status: 201 });
    response.headers.set('Set-Cookie', sessionCookie);
    return response;
  } catch (error) {
    logger.error('auth', 'Unexpected error in /api/auth/register:', { error: error });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
