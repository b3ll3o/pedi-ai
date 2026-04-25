import { IStripeAdapter, StripePaymentIntent } from '@/application/pagamento/services/adapters/IStripeAdapter';

/**
 * Implementação do adapter de Stripe.
 * Em produção, deve-se configurar as variáveis de ambiente:
 * - STRIPE_SECRET_KEY: Chave secreta do Stripe
 * - STRIPE_BASE_URL: URL base da API (default: https://api.stripe.com)
 */
export class StripeAdapter implements IStripeAdapter {
  private secretKey: string;
  private baseUrl: string;

  constructor(secretKey?: string, baseUrl: string = 'https://api.stripe.com') {
    this.secretKey = secretKey || process.env.STRIPE_SECRET_KEY || '';
    this.baseUrl = baseUrl;
  }

  /**
   * Cria uma Payment Intent no Stripe para cartão de crédito/débito
   */
  async criarPaymentIntent(valorEmCentavos: number, pedidoId: string): Promise<StripePaymentIntent> {
    // TODO: Implementar integração real com Stripe quando disponível
    // Por enquanto, retorna uma Payment Intent simulada para desenvolvimento
    const paymentIntentSimulada: StripePaymentIntent = {
      id: `pi_${pedidoId}_${Date.now()}`,
      clientSecret: `pi_${pedidoId}_secret_${Date.now()}`,
      valor: valorEmCentavos,
      status: 'requires_payment_method',
    };

    return Promise.resolve(paymentIntentSimulada);
  }
}
