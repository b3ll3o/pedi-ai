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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
): Promise<NextResponse<PixStatusResponse>> {
  const { orderId } = await params;

  // DEMO MODE: Return simulated confirmed status
  if (isDemoMode) {
    return NextResponse.json({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  try {
    // Buscar payment intent mais recente para este pedido
    const intentResult = await sql<{
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

    // Se não há payment intent, buscar order diretamente
    if (!intentResult || intentResult.length === 0) {
      const orderResult = await sql<{ payment_status: string }>`
        SELECT payment_status
        FROM orders
        WHERE id = ${orderId}
        LIMIT 1
      `;

      if (!orderResult || orderResult.length === 0) {
        return NextResponse.json({
          status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

      // Se o pedido já está pago, retornar confirmado
      if (orderResult[0].payment_status === 'paid') {
        return NextResponse.json({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        status: 'pending',
        updated_at: new Date().toISOString(),
      });
    }

    const intent = intentResult[0];

    // Verificar se o QR code expirou
    if (intent.expires_at) {
      const expiresAt = new Date(intent.expires_at);
      if (new Date() > expiresAt && intent.status === 'pending') {
        return NextResponse.json({
          status: 'expired',
          updated_at: new Date().toISOString(),
          expires_at: intent.expires_at,
        });
      }
    }

    // Mapear status do payment_intent para resposta
    switch (intent.status as string) {
      case 'succeeded':
      case 'paid':
        return NextResponse.json({
          status: 'confirmed',
          confirmed_at: intent.created_at,
          updated_at: new Date().toISOString(),
        });

      case 'failed':
        return NextResponse.json({
          status: 'payment_failed',
          updated_at: new Date().toISOString(),
        });

      case 'pending':
      default:
        return NextResponse.json({
          status: 'pending',
          updated_at: new Date().toISOString(),
          expires_at: intent.expires_at ?? undefined,
        });
    }
  } catch (error) {
    logger.error('payments/pix', 'Erro ao verificar status PIX:', { error: error });
    return NextResponse.json(
      { status: 'pending', updated_at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
