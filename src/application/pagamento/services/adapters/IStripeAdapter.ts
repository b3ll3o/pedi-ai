/**
 * Interface para o adapter de Stripe.
 * Será implementada por infrastructure/external/StripeAdapter em Phase 4.
 */
export interface StripePaymentIntent {
  id: string;
  clientSecret: string;
  valor: number;
  status: string;
}

export interface IStripeAdapter {
  criarPaymentIntent(valorEmCentavos: number, pedidoId: string): Promise<StripePaymentIntent>;
}
