import { NextRequest, NextResponse } from 'next/server';
import { PostgresAuthAdapter } from '@/infrastructure/external/PostgresAuthAdapter';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Request password reset using PostgresAuthAdapter
    const resultado = await PostgresAuthAdapter.enviarRedefinicaoSenha(email);

    if (!resultado?.success) {
      return NextResponse.json(
        { error: resultado?.error || 'Erro ao solicitar recuperação de senha' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Email de recuperação enviado' });
  } catch (error) {
    logger.error('auth', 'Unexpected error in /api/auth/request-reset:', { error: error });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
