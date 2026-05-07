import { loadStripe } from '@stripe/stripe-js';
import type { Stripe, PaymentIntent as StripePaymentIntent } from '@stripe/stripe-js';
import type { IStripeAdapter, PaymentIntent, RefundResult } from '@/application/pagamento/services/adapters/IStripeAdapter';

const isDemoMode = () => process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE === 'true';

/**
 * Adapter de Stripe para processar pagamentos via cartão.
 * Implementa a interface IStripeAdapter.
 *
 * Variáveis de ambiente necessárias:
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: Chave publicável do Stripe
 * - STRIPE_SECRET_KEY: Chave secreta do Stripe (lado servidor)
 * - NEXT_PUBLIC_DEMO_PAYMENT_MODE: Se "true", retorna dados simulados (para desenvolvimento)
 */
export class StripeAdapter implements IStripeAdapter {
  private stripePromise: Promise<Stripe | null>;

  constructor(publishableKey?: string) {
    this.stripePromise = loadStripe(publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');
  }

  /**
   * Cria um PaymentIntent no Stripe.
   */
  async criarPaymentIntent(
    amount: number,
    currency: string,
    pedidoId: string
  ): Promise<PaymentIntent> {
    if (isDemoMode()) {
      return this.criarPaymentIntentSimulado(amount, currency, pedidoId);
    }

    try {
      const response = await fetch('/api/stripe/payment-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, pedidoId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar PaymentIntent');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao criar PaymentIntent: ${message}`);
    }
  }

  /**
   * Confirma um PaymentIntent no Stripe.
   */
  async confirmarPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    if (isDemoMode()) {
      return this.confirmarPaymentIntentSimulado(paymentIntentId);
    }

    try {
      const stripe = await this.stripePromise;
      if (!stripe) {
        throw new Error('Stripe não foi carregado. Verifique a chave publicável.');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(paymentIntentId);

      if (error) {
        throw new Error(`Erro ao confirmar PaymentIntent: ${error.message}`);
      }

      if (!paymentIntent) {
        throw new Error('PaymentIntent não foi retornado pelo Stripe');
      }

      return this.stripePaymentIntentToDomain(paymentIntent);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao confirmar PaymentIntent: ${message}`);
    }
  }

  /**
   * Cancela um PaymentIntent no Stripe.
   */
  async cancelarPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    if (isDemoMode()) {
      return this.cancelarPaymentIntentSimulado(paymentIntentId);
    }

    try {
      const response = await fetch(`/api/stripe/payment-intents/${paymentIntentId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao cancelar PaymentIntent');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao cancelar PaymentIntent: ${message}`);
    }
  }

  /**
   * Estorna um pagamento via Stripe.
   */
  async estornar(paymentIntentId: string, amount?: number): Promise<RefundResult> {
    if (isDemoMode()) {
      return this.estornarSimulado(paymentIntentId, amount);
    }

    try {
      const response = await fetch('/api/stripe/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId, amount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar estorno');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao estornar pagamento: ${message}`);
    }
  }

  /**
   * Busca o status de um PaymentIntent.
   */
  async buscarPaymentIntent(paymentIntentId: string): Promise<PaymentIntent> {
    if (isDemoMode()) {
      return this.buscarPaymentIntentSimulado(paymentIntentId);
    }

    try {
      const response = await fetch(`/api/stripe/payment-intents/${paymentIntentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao buscar PaymentIntent');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Error(`Falha ao buscar PaymentIntent: ${message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Métodos simulados (modo demo)
  // ---------------------------------------------------------------------------

  private criarPaymentIntentSimulado(amount: number, currency: string, pedidoId: string): PaymentIntent {
    return {
      id: `pi_simulado_${Date.now()}`,
      amount,
      currency,
      status: 'requires_payment_method',
      clientSecret: `pi_simulado_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      metadata: { pedidoId },
    };
  }

  private confirmarPaymentIntentSimulado(paymentIntentId: string): PaymentIntent {
    return {
      id: paymentIntentId,
      amount: 0,
      currency: 'brl',
      status: 'succeeded',
      clientSecret: '',
      metadata: {},
    };
  }

  private cancelarPaymentIntentSimulado(paymentIntentId: string): PaymentIntent {
    return {
      id: paymentIntentId,
      amount: 0,
      currency: 'brl',
      status: 'canceled',
      clientSecret: '',
      metadata: {},
    };
  }

  private estornarSimulado(paymentIntentId: string, amount?: number): RefundResult {
    return {
      id: `re_simulado_${Date.now()}`,
      amount: amount || 0,
      status: 'succeeded',
      paymentIntentId,
    };
  }

  private buscarPaymentIntentSimulado(paymentIntentId: string): PaymentIntent {
    return {
      id: paymentIntentId,
      amount: 0,
      currency: 'brl',
      status: 'succeeded',
      clientSecret: '',
      metadata: {},
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private stripePaymentIntentToDomain(pi: StripePaymentIntent): PaymentIntent {
    const metadata: Record<string, string> = {};
    // Stripe JS types may not include metadata on PaymentIntent despite the API returning it
    const stripePi = pi as StripePaymentIntent & { metadata?: Record<string, string> };
    if (stripePi.metadata) {
      for (const key in stripePi.metadata) {
        metadata[key] = stripePi.metadata[key];
      }
    }
    return {
      id: pi.id,
      amount: pi.amount,
      currency: pi.currency,
      status: pi.status as PaymentIntent['status'],
      clientSecret: pi.client_secret || '',
      metadata,
    };
  }
}
