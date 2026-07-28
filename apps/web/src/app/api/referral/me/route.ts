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
import { Referral, type ReferralProps } from '@/domain/referral/Referral';

/** Converte ReferralDTO (formato cru vindo da API) em props de domínio. */
function toReferralProps(dto: {
  id: string;
  referrerRestaurantId: string;
  code: string;
  totalSignups: number;
  totalConversions: number;
  rewardCreditMonths: number;
  rewardCreditAppliedMonths: number;
  status: 'pending' | 'converted' | 'expired' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  version: number;
}): ReferralProps {
  return {
    id: dto.id,
    referrerRestaurantId: dto.referrerRestaurantId,
    code: dto.code,
    totalSignups: dto.totalSignups,
    totalConversions: dto.totalConversions,
    rewardCreditMonths: dto.rewardCreditMonths,
    rewardCreditAppliedMonths: dto.rewardCreditAppliedMonths,
    status: dto.status,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    version: dto.version,
  };
}

export async function GET(request: NextRequest) {
  try {
    const apiClient = getApiClient(request);
    const restaurant = await apiClient.getCurrentRestaurant();

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 });
    }

    // Busca referral existente
    const referralDto = await apiClient.getReferralByRestaurant(restaurant.id);

    // Se não existe, cria um novo
    let finalDto = referralDto;
    if (!finalDto) {
      const newReferral = Referral.create(restaurant.id);
      finalDto = await apiClient.createReferral(newReferral);
    }

    // Rehidrata DTO em entidade de domínio (campos calculados + métodos).
    const referral = Referral.reconstruct(toReferralProps(finalDto));

    return NextResponse.json({
      referral: {
        code: referral.code,
        totalSignups: referral.totalSignups,
        totalConversions: referral.totalConversions,
        rewardCreditMonths: referral.rewardCreditMonths,
        availableCreditMonths: referral.availableCreditMonths,
        shareUrl: referral.shareUrl(process.env.NEXT_PUBLIC_APP_URL || 'https://pedi.ai'),
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
    const restaurant = await apiClient.getCurrentRestaurant();

    if (!restaurant) {
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
    if (existing && existing.referrerRestaurantId !== restaurant.id) {
      return NextResponse.json({ error: 'Código já em uso' }, { status: 409 });
    }

    // Atualiza
    const updatedDto = await apiClient.updateReferralCode(restaurant.id, code);
    const referral = Referral.reconstruct(toReferralProps(updatedDto));

    return NextResponse.json({
      referral: {
        code: referral.code,
        shareUrl: referral.shareUrl(process.env.NEXT_PUBLIC_APP_URL || 'https://pedi.ai'),
      },
    });
  } catch (error) {
    console.error('Error in POST /api/referral/me/custom-code:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
