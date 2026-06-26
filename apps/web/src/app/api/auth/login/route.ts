import { NextRequest, NextResponse } from 'next/server';

import { apiClient } from '@/lib/api-client';
import { createRateLimiter } from '@/lib/rate-limit';

// S3#4: defesa contra brute-force. Limite por (IP + email) — ator com
// IP fixo atacando uma conta específica cai rápido, e tentativas a
// contas diferentes vindas do mesmo IP também são contidas. Janela de
// 60s × 10 tentativas: ~ 1 login a cada 6s é humanamente factível;
// além disso, é bot.
const loginLimiter = createRateLimiter({ max: 10, windowMs: 60_000 });

function getClientKey(request: NextRequest, email: string): string {
  // Em produção multi-instância, usar IP real via X-Forwarded-For.
  // Em dev/local, `ip` é `::1` ou similar — ainda funciona como chave.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown-ip';
  return `${ip}::${email.toLowerCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, senha } = body;

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 });
    }

    const key = getClientKey(request, email);
    if (!loginLimiter.check(key)) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' },
        { status: 429 }
      );
    }

    const result = await apiClient.login(email, senha);

    // Login bem-sucedido: limpa o contador para que usuário legítimo
    // não fique bloqueado após algumas falhas seguidas de sucesso.
    loginLimiter.reset(key);

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
