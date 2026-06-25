/**
 * Cobertura: RF-PAY-06 (Modo demo PIX)
 * @see .openspec/specs/pagamento/design.md
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PixAdapter } from '@/infrastructure/external/PixAdapter';

describe('PixAdapter (RF-PAY-06 — Modo Demo)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('Modo Demo ativado', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'true';
    });

    it('deve retornar cobrança simulada sem chamar Mercado Pago', async () => {
      const adapter = new PixAdapter();
      const charge = await adapter.criarCobranca(1500, 'pedido-1');

      expect(charge.id).toMatch(/^pix_pedido-1_/);
      expect(charge.valor).toBe(15); // 1500 centavos = R$ 15
      expect(charge.imagemQrCode).toMatch(/^data:image\/png;base64,/);
      expect(charge.codigoPix).toContain('br.gov.bcb.pix');
      expect(charge.expiracao).toBeInstanceOf(Date);
      // Expiração deve ser ~30 min no futuro
      const diffMin = (charge.expiracao.getTime() - Date.now()) / 60_000;
      expect(diffMin).toBeGreaterThan(28);
      expect(diffMin).toBeLessThan(32);
    });

    it('deve retornar valor correto para diferentes valores em centavos', async () => {
      const adapter = new PixAdapter();
      const c1 = await adapter.criarCobranca(100, 'p-1'); // R$ 1
      const c2 = await adapter.criarCobranca(10000, 'p-2'); // R$ 100
      const c3 = await adapter.criarCobranca(99, 'p-3'); // R$ 0,99

      expect(c1.valor).toBe(1);
      expect(c2.valor).toBe(100);
      expect(c3.valor).toBe(0.99);
    });

    it('deve incluir pedidoId no código Pix simulado', async () => {
      const adapter = new PixAdapter();
      const charge = await adapter.criarCobranca(1500, 'PEDIDO-123');
      expect(charge.codigoPix).toContain('PEDIDO-123');
    });

    it('deve retornar status simulado em verificarStatus', async () => {
      const adapter = new PixAdapter();
      const status = await adapter.verificarStatus('pix_test_123');
      expect(status.id).toBe('pix_test_123');
      expect(status.expiracao).toBeInstanceOf(Date);
    });

    it('não deve exigir access token em modo demo', async () => {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      const adapter = new PixAdapter();
      // Não deve lançar
      await expect(adapter.criarCobranca(1000, 'p-1')).resolves.toBeDefined();
    });
  });

  describe('Modo Produção (sem demo)', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE = 'false';
    });

    it('deve lançar erro se access token não está configurado', async () => {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      const adapter = new PixAdapter();
      await expect(adapter.criarCobranca(1000, 'p-1')).rejects.toThrow(/Mercado Pago access token/);
    });

    it('deve lançar erro em verificarStatus sem access token', async () => {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      const adapter = new PixAdapter();
      await expect(adapter.verificarStatus('pix_1')).rejects.toThrow(/Mercado Pago access token/);
    });
  });

  describe('Construtor', () => {
    it('deve aceitar access token explícito', () => {
      const adapter = new PixAdapter('explicit-token');
      // Não há getter público; valida que não lança
      expect(adapter).toBeInstanceOf(PixAdapter);
    });

    it('deve usar MERCADOPAGO_ACCESS_TOKEN do env', () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = 'env-token';
      const adapter = new PixAdapter();
      expect(adapter).toBeInstanceOf(PixAdapter);
    });

    it('deve aceitar string vazia como fallback', () => {
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
      const adapter = new PixAdapter();
      expect(adapter).toBeInstanceOf(PixAdapter);
    });
  });
});
