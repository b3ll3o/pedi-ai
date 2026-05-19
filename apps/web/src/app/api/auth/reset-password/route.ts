import { NextRequest, NextResponse } from 'next/server';
import { PostgresAuthAdapter } from '@/infrastructure/external/PostgresAuthAdapter';
import { logger } from '@/lib/logger';

type ResetPasswordResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email é obrigatório' }, { status: 400 });
    }

    // Send password reset email using PostgresAuthAdapter
    const resultado = await PostgresAuthAdapter.enviarRedefinicaoSenha(email);

    if (!resultado?.success) {
      return NextResponse.json(
        { success: false, error: resultado?.error || 'Erro ao solicitar recuperação de senha' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Email de recuperação enviado' },
      { status: 200 }
    );
  } catch (error) {
    logger.error('auth', 'Unexpected error in /api/auth/reset-password:', { error: error });
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
