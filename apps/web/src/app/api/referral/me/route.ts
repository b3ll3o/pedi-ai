/**
 * API Route: GET /api/referral/me
 *
 * Retorna o Referral do restaurante autenticado (cria se não existir).
 *
 * Response:
 * ```json
 * {
 *   "referral": {
 *     "code": "ABC23456",
 *     "totalSignups": 5,
 *     "totalConversions": 2,
 *     "rewardCreditMonths": 0,
 *     "availableCreditMonths": 0,
 *     "shareUrl": "https://pedi.ai/register?ref=ABC23456"
 *   }
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';

import { getApiClient } from '@/lib/api-client';
import { Referral } from '@/domain/referral/Referral';

export async function GET(request: NextRequest) {
  try {
    const apiClient = getApiClient(request);
    const restaurant = await apiClient.getCurrentRestaurant();

    if (!restaurante) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 });
    }

    // Busca referral existente
    const referral = await apiClient.getReferralByRestaurant(restaurante.id);

    // Se não existe, cria um novo
    let referralData = referral;
    if (!referralData) {
      const newReferral = Referral.create(restaurante.id);
      referralData = await apiClient.createReferral(newReferral);
    }

    return NextResponse.json({
      referral: {
        code: referralData.code,
        totalSignups: referralData.totalSignups,
        totalConversions: referralData.totalConversions,
        rewardCreditMonths: referralData.rewardCreditMonths,
        availableCreditMonths: referralData.availableCreditMonths,
        shareUrl: referralData.shareUrl(process.env.NEXT_PUBLIC_APP_URL || 'https://pedi.ai'),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/referral/me:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

/**
 * POST /api/referral/me/custom-code
 *
 * Permite ao dono customizar o código (se disponível).
 */
export async function POST(request: NextRequest) {
  try {
    const apiClient = getApiClient(request);
    const restaurante = await apiClient.getCurrentRestaurant();

    if (!restaurante) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { code } = body;

    // Validação: 6-12 caracteres alfanuméricos
    if (!/^[A-Z0-9]{6,12}$/.test(code)) {
      return NextResponse.json(
        { error: 'Código inválido (6-12 caracteres alfanuméricos maiúsculos)' },
        { status: 400 }
      );
    }

    // Verifica disponibilidade
    const existing = await apiClient.getReferralByCode(code);
    if (existing && existing.referrerRestaurantId !== restaurante.id) {
      return NextResponse.json({ error: 'Código já em uso' }, { status: 409 });
    }

    // Atualiza
    const updated = await apiClient.updateReferralCode(restaurante.id, code);

    return NextResponse.json({
      referral: {
        code: updated.code,
        shareUrl: updated.shareUrl(process.env.NEXT_PUBLIC_APP_URL || 'https://pedi.ai'),
      },
    });
  } catch (error) {
    console.error('Error in POST /api/referral/me/custom-code:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}