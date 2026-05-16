import { NextResponse } from 'next/server';
import { db, isDevDatabase, getSupabaseAdmin } from '@/infrastructure/database';
import { orders, paymentIntents } from '@/infrastructure/database/schema';
import { eq, desc } from 'drizzle-orm';
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
    if (isDevDatabase()) {
      // Buscar payment intent mais recente para este pedido
      const intentResult = await db
        .select()
        .from(paymentIntents)
        .where(eq(paymentIntents.order_id, orderId))
        .orderBy(desc(paymentIntents.created_at))
        .limit(1);

      // Se não há payment intent, buscar order diretamente
      if (!intentResult || intentResult.length === 0) {
        const orderResult = await db
          .select({ payment_status: orders.payment_status })
          .from(orders)
          .where(eq(orders.id, orderId))
          .limit(1);

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
          })

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
    } else {
      const supabase = getSupabaseAdmin();

      // Buscar payment intent mais recente para este pedido
      const { data: intent, error: intentError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('order_id', orderId)
        .eq('payment_method', 'pix')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (intentError && intentError.code !== 'PGRST116') {
        logger.error("payments/pix", "Erro ao buscar payment intent:", { error: intentError });
        return NextResponse.json(
          { status: 'pending', updated_at: new Date().toISOString() },
          { status: 500 },
        );
      }

      // Se não há payment intent, o PIX ainda não foi criado
      if (!intent) {
        return NextResponse.json({
          status: 'pending',
          updated_at: new Date().toISOString(),
        });
      }

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
          })

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
    }
  } catch (error) {
    logger.error("payments/pix", "Erro ao verificar status PIX:", { error: error });
    return NextResponse.json(
      { status: 'pending', updated_at: new Date().toISOString() },
      { status: 500 },
    );
  }
}
