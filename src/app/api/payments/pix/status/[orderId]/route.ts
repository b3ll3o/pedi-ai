import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { payment_intents } from '@/lib/supabase/types';

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
    const supabase = await createClient();

    // Buscar payment intent mais recente para este pedido
    const { data: intent, error: intentError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('order_id', orderId)
      .eq('payment_method', 'pix')
      .order('created_at', { ascending: false })
      .limit(1)
      .single<payment_intents>();

    if (intentError && intentError.code !== 'PGRST116') {
      console.error('Erro ao buscar payment intent:', intentError);
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
  } catch (error) {
    console.error('Erro ao verificar status PIX:', error);
    return NextResponse.json(
      { status: 'pending', updated_at: new Date().toISOString() },
      { status: 500 },
    );
  }
}
