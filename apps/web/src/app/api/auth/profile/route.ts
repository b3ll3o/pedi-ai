import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth/session';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    return NextResponse.json({
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      restaurantId: session.user.restaurantId,
    });
  } catch (error) {
    logger.error('auth', 'Erro inesperado em /api/auth/profile:', { error: error });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
