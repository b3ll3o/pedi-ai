/**
 * Interface para o adapter de Stripe.
 * Implementada por infrastructure/external/StripeAdapter.
 */

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'requires_confirmation' | 'succeeded' | 'canceled';
  clientSecret: string;
  metadata?: Record<string, string>;
}

export interface RefundResult {
  id: string;
  amount: number;
  status: 'succeeded' | 'failed' | 'pending';
  paymentIntentId: string;
}

export interface IStripeAdapter {
  /**
   * Cria um PaymentIntent para processar pagamento via Stripe.
   * @param amount Valor em centavos
   * @param currency Código da moeda (ex: 'brl')
   * @param pedidoId ID do pedido para metadata
   */
  criarPaymentIntent(
    amount: number,
    currency: string,
    pedidoId: string
  ): Promise<PaymentIntent>;

  /**
   * Confirma um PaymentIntent após o cliente fornecer os dados de pagamento.
   */
  confirmarPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;

  /**
   * Cancela um PaymentIntent.
   */
  cancelarPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;

  /**
   * Estorna um pagamento via Stripe.
   * @param paymentIntentId ID do PaymentIntent a ser estornado
   * @param amount Valor em centavos a ser estornado (opcional, estorna o valor completo se não informado)
   */
  estornar(paymentIntentId: string, amount?: number): Promise<RefundResult>;

  /**
   * Busca o status de um PaymentIntent.
   */
  buscarPaymentIntent(paymentIntentId: string): Promise<PaymentIntent>;
}
