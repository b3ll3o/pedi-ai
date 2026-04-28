import { vi } from 'vitest';
import { IStripeAdapter, StripePaymentIntent } from '@/application/pagamento/services/adapters/IStripeAdapter';

/**
 * Configuração padrão para mocks de StripePaymentIntent
 */
export interface MockStripeConfig {
  criarPaymentIntent?: {
    valorEmCentavos?: number;
    pedidoId?: string;
    respostaParcial?: Partial<StripePaymentIntent>;
  };
}

/**
 * Cria um mock de IStripeAdapter com valores configuráveis para testes unitários.
 *
 * @param config - Configuração opcional para sobrescrever valores de retorno
 * @returns Mock do adapter Stripe
 *
 * @example
 * // Mock básico com valores padrão
 * const mockStripe = createMockStripePaymentAdapter();
 *
 * @example
 * // Mock com valores customizados
 * const mockStripe = createMockStripePaymentAdapter({
 *   criarPaymentIntent: {
 *     valorEmCentavos: 5000,
 *     pedidoId: 'pedido-123',
 *     respostaParcial: {
 *       id: 'pi_custom_123',
 *       clientSecret: 'custom_secret_123'
 *     }
 *   }
 * });
 */
export function createMockStripePaymentAdapter(config?: MockStripeConfig): IStripeAdapter {
  const defaultPaymentIntent: StripePaymentIntent = {
    id: `pi_mock_${Date.now()}`,
    clientSecret: `pi_mock_secret_${Date.now()}`,
    valor: 5000,
    status: 'requires_payment_method',
  };

  const mock = {
    criarPaymentIntent: vi.fn(async (valorEmCentavos: number, pedidoId: string): Promise<StripePaymentIntent> => {
      const intentConfig = config?.criarPaymentIntent?.respostaParcial;
      const generatedId = `pi_${pedidoId}_${Date.now()}`;

      return {
        id: intentConfig?.id ?? generatedId,
        clientSecret: intentConfig?.clientSecret ?? defaultPaymentIntent.clientSecret,
        valor: intentConfig?.valor ?? valorEmCentavos,
        status: intentConfig?.status ?? defaultPaymentIntent.status,
      };
    }),
  };

  return mock;
}

/**
 * Mock de StripePaymentIntent pré-configurado para cenários de teste comuns
 */
export const StripePaymentIntentMock = {
  /**
   * Payment Intent com status requires_payment_method (inicial)
   */
  inicial: (pedidoId: string = 'pedido-inicial'): StripePaymentIntent => ({
    id: `pi_${pedidoId}_${Date.now()}`,
    clientSecret: `pi_${pedidoId}_secret_${Date.now()}`,
    valor: 5000,
    status: 'requires_payment_method',
  }),

  /**
   * Payment Intent com status requires_confirmation (após primeira etapa)
   */
  pendenteConfirmacao: (pedidoId: string = 'pedido-pendente'): StripePaymentIntent => ({
    id: `pi_${pedidoId}_${Date.now()}`,
    clientSecret: `pi_${pedidoId}_secret_${Date.now()}`,
    valor: 5000,
    status: 'requires_confirmation',
  }),

  /**
   * Payment Intent com status succeeded (pagamento confirmado)
   */
  confirmado: (pedidoId: string = 'pedido-confirmado'): StripePaymentIntent => ({
    id: `pi_${pedidoId}_${Date.now()}`,
    clientSecret: `pi_${pedidoId}_secret_${Date.now()}`,
    valor: 5000,
    status: 'succeeded',
  }),

  /**
   * Payment Intent com status canceled
   */
  cancelado: (pedidoId: string = 'pedido-cancelado'): StripePaymentIntent => ({
    id: `pi_${pedidoId}_${Date.now()}`,
    clientSecret: `pi_${pedidoId}_secret_${Date.now()}`,
    valor: 5000,
    status: 'canceled',
  }),
};
