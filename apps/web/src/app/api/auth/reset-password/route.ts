import { NextRequest, NextResponse } from 'next/server';

import { logger } from '@/lib/logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ResetPasswordResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

export async function POST(request: NextRequest): Promise<NextResponse<ResetPasswordResponse>> {
  try {
    const body = await request.json();
    const { email, token, newPassword } = body;

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Email, token e nova senha são obrigatórios' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('auth', 'Error resetting password:', { error: data });
      return NextResponse.json(
        { success: false, error: data.error || 'Erro ao redefinir senha' },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Senha redefinida com sucesso',
    });
  } catch (error) {
    logger.error('auth', 'Unexpected error in /api/auth/reset-password:', { error });
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
