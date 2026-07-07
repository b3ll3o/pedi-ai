/**
 * API Route: GET /api/referral/validate?code=XXX
 *
 * Valida um código de referral e retorna informações básicas.
 * **Público** (não requer auth) — usado no signup.
 *
 * Response 200:
 * ```json
 * {
 *   "valid": true,
 *   "code": "ABC23456",
 *   "referrerRestaurantName": "Pizzaria do Zé"  // só se restaurante permitir
 * }
 * ```
 *
 * Response 404:
 * ```json
 * { "valid": false, "error": "Código inválido ou expirado" }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';

import { getApiClient } from '@/lib/api-client';

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.json({ valid: false, error: 'Código não fornecido' }, { status: 400 });
    }

    // Validação de formato
    if (!/^[A-Z0-9]{6,12}$/.test(code)) {
      return NextResponse.json(
        { valid: false, error: 'Formato de código inválido' },
        { status: 400 }
      );
    }

    const apiClient = getApiClient(request);
    const referral = await apiClient.getReferralByCode(code);

    if (!referral || referral.status !== 'pending') {
      return NextResponse.json(
        { valid: false, error: 'Código inválido ou expirado' },
        { status: 404 }
      );
    }

    // Verifica se ainda está dentro do limite de conversões
    if (referral.totalConversions >= 100) {
      // MAX_CONVERSIONS_PER_REFERRER
      return NextResponse.json(
        { valid: false, error: 'Programa de referral atingiu limite' },
        { status: 410 } // Gone
      );
    }

    // Retorna apenas o necessário (LGPD: mínimo de info)
    return NextResponse.json({
      valid: true,
      code: referral.code,
      // NÃO retorna o nome do restaurante no MVP — segurança
      // (pode ser adicionado depois com consentimento)
      reward: {
        newCustomerGets: '1 mês grátis',
      },
    });
  } catch (error) {
    console.error('Error in GET /api/referral/validate:', error);
    return NextResponse.json({ valid: false, error: 'Erro interno' }, { status: 500 });
  }
}