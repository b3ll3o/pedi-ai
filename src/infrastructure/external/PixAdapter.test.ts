import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PixAdapter } from '@/infrastructure/external/PixAdapter';

const mockPaymentInstance = {
  create: vi.fn(),
  get: vi.fn(),
};

vi.mock('mercadopago', () => ({
  MercadoPagoConfig: vi.fn().mockImplementation(function() {
    return {};
  }),
  Payment: vi.fn().mockImplementation(function() {
    return mockPaymentInstance;
  }),
}));

describe('PixAdapter', () => {
  let adapter: PixAdapter;

  beforeEach(() => {
    adapter = new PixAdapter('fake-access-token');
  });

  describe('criarCobranca', () => {
    it('deve criar cobrança simulada em modo demo', async () => {
      // Forçar modo demo
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'true';

      const resultado = await adapter.criarCobranca(5000, 'pedido-123');

      expect(resultado.id).toContain('pix_pedido-123');
      expect(resultado.valor).toBe(50); // 5000 centavos = 50 reais
      expect(resultado.codigoPix).toBeTruthy();
      expect(resultado.imagemQrCode).toBeTruthy();
      expect(resultado.expiracao).toBeInstanceOf(Date);
    });

    it('deve lançar erro quando token não está configurado (modo produção)', async () => {
      delete process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE;
      const adapterSemToken = new PixAdapter('');

      await expect(adapterSemToken.criarCobranca(5000, 'pedido-123'))
        .rejects.toThrow('Mercado Pago access token não configurado');
    });
  });

  describe('verificarStatus', () => {
    it('deve retornar status simulado em modo demo', async () => {
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'true';

      const resultado = await adapter.verificarStatus('pix_123');

      expect(resultado.id).toBe('pix_123');
      expect(resultado.expiracao).toBeInstanceOf(Date);
    });
  });
});
