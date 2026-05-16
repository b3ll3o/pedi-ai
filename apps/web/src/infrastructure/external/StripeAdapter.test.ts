import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StripeAdapter } from '@/infrastructure/external/StripeAdapter';
import { loadStripe } from '@stripe/stripe-js';

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(),
}));

vi.mocked(loadStripe).mockResolvedValue({
  confirmCardPayment: vi.fn(),
} as unknown as Awaited<ReturnType<typeof loadStripe>>);

describe('StripeAdapter', () => {
  let adapter: StripeAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new StripeAdapter('pk_test_fake');
  });

  describe('criarPaymentIntent', () => {
    it('deve criar PaymentIntent simulado em modo demo', async () => {
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'true';

      const resultado = await adapter.criarPaymentIntent(5000, 'brl', 'pedido-abc');

      expect(resultado.id).toContain('pi_simulado');
      expect(resultado.amount).toBe(5000);
      expect(resultado.currency).toBe('brl');
      expect(resultado.status).toBe('requires_payment_method');
      expect(resultado.clientSecret).toBeTruthy();
      expect(resultado.metadata?.pedidoId).toBe('pedido-abc');
    });

    it('deve lançar erro em modo produção sem token', async () => {
      delete process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE;
      const adapterSemToken = new StripeAdapter('');

      // Mock do fetch para falhar
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      await expect(adapterSemToken.criarPaymentIntent(5000, 'brl', 'pedido-abc')).rejects.toThrow();
    });
  });

  describe('confirmarPaymentIntent', () => {
    it('deve confirmar PaymentIntent simulado em modo demo', async () => {
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'true';

      const resultado = await adapter.confirmarPaymentIntent('pi_12345');

      expect(resultado.id).toBe('pi_12345');
      expect(resultado.status).toBe('succeeded');
    });
  });

  describe('cancelarPaymentIntent', () => {
    it('deve cancelar PaymentIntent simulado em modo demo', async () => {
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'true';

      const resultado = await adapter.cancelarPaymentIntent('pi_12345');

      expect(resultado.id).toBe('pi_12345');
      expect(resultado.status).toBe('canceled');
    });
  });

  describe('estornar', () => {
    it('deve criar estorno simulado em modo demo', async () => {
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'true';

      const resultado = await adapter.estornar('pi_12345', 5000);

      expect(resultado.id).toContain('re_simulado');
      expect(resultado.paymentIntentId).toBe('pi_12345');
      expect(resultado.amount).toBe(5000);
      expect(resultado.status).toBe('succeeded');
    });

    it('deve estornar valor completo quando amount não informado', async () => {
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'true';

      const resultado = await adapter.estornar('pi_12345');

      expect(resultado.amount).toBe(0); // Valor padrão quando não informado
    });
  });

  describe('buscarPaymentIntent', () => {
    it('deve buscar PaymentIntent simulado em modo demo', async () => {
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'true';

      const resultado = await adapter.buscarPaymentIntent('pi_12345');

      expect(resultado.id).toBe('pi_12345');
      expect(resultado.status).toBe('succeeded');
    });
  });
});
