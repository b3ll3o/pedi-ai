import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const response = await fetch(`${API_URL}/auth/request-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('auth', 'Error requesting password reset:', { error: data });
      return NextResponse.json(
        { error: data.error || 'Erro interno do servidor' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.message || 'Email de recuperação enviado',
    });
  } catch (error) {
    logger.error('auth', 'Unexpected error in /api/auth/request-reset:', { error });
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
