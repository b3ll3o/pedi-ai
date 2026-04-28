import { describe, it, expect, vi } from 'vitest';
import { createMockPixPaymentAdapter, PixChargeMock } from './PixPaymentAdapter.mock';
import { createMockStripePaymentAdapter, StripePaymentIntentMock } from './StripePaymentAdapter.mock';

describe('Payment Adapter Mocks', () => {
  describe('PixPaymentAdapter Mock', () => {
    it('deve criar mock com valores padrão', () => {
      const mockPix = createMockPixPaymentAdapter();

      expect(mockPix).toBeDefined();
      expect(typeof mockPix.criarCobranca).toBe('function');
      expect(typeof mockPix.verificarStatus).toBe('function');
    });

    it('deve permitir override de valores de retorno', async () => {
      const mockPix = createMockPixPaymentAdapter({
        criarCobranca: {
          valorEmCentavos: 5000,
          pedidoId: 'pedido-123',
          respostaParcial: {
            id: 'pix_custom_123',
            valor: 75.50,
          },
        },
      });

      const result = await mockPix.criarCobranca(5000, 'pedido-123');

      expect(result.id).toBe('pix_custom_123');
      expect(result.valor).toBe(75.50);
    });

    it('deve suportar vi.fn() para spying', async () => {
      const mockPix = createMockPixPaymentAdapter();

      await mockPix.criarCobranca(1000, 'pedido-test');

      expect(mockPix.criarCobranca).toHaveBeenCalledWith(1000, 'pedido-test');
      expect(mockPix.criarCobranca).toHaveBeenCalledTimes(1);
    });

    it('PixChargeMock.pendente deve retornar cobrança pendente', () => {
      const pendente = PixChargeMock.pendente('pedido-1');

      expect(pendente.id).toContain('pix_pedido-1');
      expect(pendente.valor).toBe(100.00);
      expect(pendente.codigoPix).toContain('pedido-1');
    });

    it('PixChargeMock.expirado deve ter expiração no passado', () => {
      const expirado = PixChargeMock.expirado('pedido-exp');

      expect(expirado.expiracao.getTime()).toBeLessThan(Date.now());
    });
  });

  describe('StripePaymentAdapter Mock', () => {
    it('deve criar mock com valores padrão', () => {
      const mockStripe = createMockStripePaymentAdapter();

      expect(mockStripe).toBeDefined();
      expect(typeof mockStripe.criarPaymentIntent).toBe('function');
    });

    it('deve permitir override de valores de retorno', async () => {
      const mockStripe = createMockStripePaymentAdapter({
        criarPaymentIntent: {
          valorEmCentavos: 10000,
          pedidoId: 'pedido-stripe-123',
          respostaParcial: {
            id: 'pi_custom_stripe_123',
            clientSecret: 'custom_secret_123',
            status: 'succeeded',
          },
        },
      });

      const result = await mockStripe.criarPaymentIntent(10000, 'pedido-stripe-123');

      expect(result.id).toBe('pi_custom_stripe_123');
      expect(result.clientSecret).toBe('custom_secret_123');
      expect(result.status).toBe('succeeded');
    });

    it('deve suportar vi.fn() para spying', async () => {
      const mockStripe = createMockStripePaymentAdapter();

      await mockStripe.criarPaymentIntent(2500, 'pedido-spy');

      expect(mockStripe.criarPaymentIntent).toHaveBeenCalledWith(2500, 'pedido-spy');
      expect(mockStripe.criarPaymentIntent).toHaveBeenCalledTimes(1);
    });

    it('StripePaymentIntentMock.confirmado deve ter status succeeded', () => {
      const confirmado = StripePaymentIntentMock.confirmado('pedido-confirm');

      expect(confirmado.status).toBe('succeeded');
      expect(confirmado.id).toContain('pi_pedido-confirm');
    });

    it('StripePaymentIntentMock.cancelado deve ter status canceled', () => {
      const cancelado = StripePaymentIntentMock.cancelado('pedido-canc');

      expect(cancelado.status).toBe('canceled');
    });
  });
});
