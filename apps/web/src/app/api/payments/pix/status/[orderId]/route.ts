import { NextResponse } from 'next/server';

import { sql } from '@/infrastructure/database/pg-client';
import { logger } from '@/lib/logger';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE === 'true';

interface PixStatusResponse {
  status: 'pending' | 'confirmed' | 'expired' | 'payment_failed';
  updated_at: string;
  confirmed_at?: string;
  expires_at?: string;
}

function getDemoStatus(): PixStatusResponse {
  return {
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function isIntentExpired(intent: { expires_at: string | null; status: string }): boolean {
  if (!intent.expires_at) return false;
  const expiresAt = new Date(intent.expires_at);
  return new Date() > expiresAt && intent.status === 'pending';
}

function mapIntentStatus(intent: {
  status: string;
  created_at: string;
  expires_at: string | null;
}): PixStatusResponse {
  const { status, created_at, expires_at } = intent;

  switch (status) {
    case 'succeeded':
    case 'paid':
      return {
        status: 'confirmed',
        confirmed_at: created_at,
        updated_at: new Date().toISOString(),
      };

    case 'failed':
      return {
        status: 'payment_failed',
        updated_at: new Date().toISOString(),
      };

    case 'pending':
    default:
      return {
        status: 'pending',
        updated_at: new Date().toISOString(),
        expires_at: expires_at ?? undefined,
      };
  }
}

function getOrderStatus(orderResult: { payment_status: string }[]): PixStatusResponse | null {
  if (!orderResult || orderResult.length === 0) {
    return { status: 'pending', updated_at: new Date().toISOString() };
  }

  if (orderResult[0].payment_status === 'paid') {
    return {
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return { status: 'pending', updated_at: new Date().toISOString() };
}

async function fetchPaymentIntent(orderId: string) {
  return sql<{
    id: string;
    status: string;
    expires_at: string | null;
    created_at: string;
  }>`
    SELECT id, status, expires_at, created_at
    FROM payment_intents
    WHERE order_id = ${orderId} AND payment_method = 'pix'
    ORDER BY created_at DESC
    LIMIT 1
  `;
}

async function fetchOrderStatus(orderId: string) {
  return sql<{ payment_status: string }>`
    SELECT payment_status
    FROM orders
    WHERE id = ${orderId}
    LIMIT 1
  `;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<NextResponse<PixStatusResponse>> {
  const { orderId } = await params;

  // DEMO MODE: Return simulated confirmed status
  if (isDemoMode) {
    return NextResponse.json(getDemoStatus());
  }

  try {
    // Buscar payment intent mais recente para este pedido
    const intentResult = await fetchPaymentIntent(orderId);

    // Se não há payment intent, buscar order diretamente
    if (!intentResult || intentResult.length === 0) {
      const orderResult = await fetchOrderStatus(orderId);
      const response = getOrderStatus(orderResult);
      return NextResponse.json(response!);
    }

    const intent = intentResult[0];

    // Verificar se o QR code expirou
    if (isIntentExpired(intent)) {
      return NextResponse.json({
        status: 'expired',
        updated_at: new Date().toISOString(),
        expires_at: intent.expires_at,
      });
    }

    // Mapear status do payment_intent para resposta
    return NextResponse.json(mapIntentStatus(intent));
  } catch (error) {
    logger.error('payments/pix', 'Erro ao verificar status PIX:', { error: error });
    return NextResponse.json(
      { status: 'pending', updated_at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
