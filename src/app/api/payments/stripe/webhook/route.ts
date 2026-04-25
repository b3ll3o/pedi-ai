import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { ProcessarWebhookUseCase, type WebhookInput } from '@/application/pagamento/services/ProcessarWebhookUseCase';
import { PagamentoRepository } from '@/infrastructure/persistence/pagamento/PagamentoRepository';
import { TransacaoRepository } from '@/infrastructure/persistence/pagamento/TransacaoRepository';
import { db } from '@/infrastructure/persistence/database';
import { EventDispatcher } from '@/domain/shared';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE === 'true';

/**
 * Signature validator que delega para o Stripe SDK.
 * Como o Stripe SDK já valida a assinatura em constructEvent,
 * após essa etapa a assinatura já foi verificada.
 */
const stripeSignatureValidator = {
  validar(_provider: 'pix' | 'stripe', _payload: string, _signature: string): boolean {
    // A validação de assinatura do Stripe é feita pelo Stripe.webhooks.constructEvent
    // antes de chamar este validator. Aqui apenas retornamos true.
    return true;
  },
};

export async function POST(request: NextRequest) {
  // Demo mode: skip webhook processing
  if (isDemoMode) {
    return NextResponse.json({ received: true, demo: true });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = Stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Instanciar use case e processar webhook via application layer
    const pagamentoRepo = new PagamentoRepository(db);
    const transacaoRepo = new TransacaoRepository(db);
    const eventDispatcher = EventDispatcher.getInstance();

    const processarWebhookUseCase = new ProcessarWebhookUseCase(
      pagamentoRepo,
      transacaoRepo,
      eventDispatcher,
      stripeSignatureValidator
    );

    // Converter Stripe.Event para formato esperado pelo use case
    const webhookInput: WebhookInput = {
      provider: 'stripe',
      payload: event as unknown as Record<string, unknown>,
      signature: signature,
    };

    const resultado = await processarWebhookUseCase.execute(webhookInput);

    if (!resultado.sucesso) {
      console.error('Webhook processing failed:', resultado.mensagem);
      return NextResponse.json(
        { error: resultado.mensagem },
        { status: 400 }
      );
    }

    return NextResponse.json({ received: true, eventoId: resultado.eventoId });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
