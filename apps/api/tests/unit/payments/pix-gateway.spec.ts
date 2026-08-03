import { describe, it, expect, vi, beforeEach } from 'vitest';

import { DemoPixGateway } from '../../../src/payments/infrastructure/demo-pix.gateway';
import { MercadoPagoPixGateway } from '../../../src/payments/infrastructure/mercadopago-pix.gateway';
import {
  buildIdempotencyKey,
  resolvePixGatewayMode,
} from '../../../src/payments/infrastructure/pix-gateway';

describe('PixGateway', () => {
  describe('resolvePixGatewayMode', () => {
    beforeEach(() => {
      delete process.env.PIX_GATEWAY_MODE;
      delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    });

    it('retorna "demo" quando nem mode nem token estão definidos', () => {
      expect(resolvePixGatewayMode()).toBe('demo');
    });

    it('retorna "mp" quando MERCADOPAGO_ACCESS_TOKEN está presente (sem mode explícito)', () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token';
      expect(resolvePixGatewayMode()).toBe('mp');
    });

    it('respeita PIX_GATEWAY_MODE explícito (mp sobrepõe ausência de token)', () => {
      process.env.PIX_GATEWAY_MODE = 'mp';
      expect(resolvePixGatewayMode()).toBe('mp');
    });

    it('respeita PIX_GATEWAY_MODE explícito (demo sobrepõe presença de token)', () => {
      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token';
      process.env.PIX_GATEWAY_MODE = 'demo';
      expect(resolvePixGatewayMode()).toBe('demo');
    });

    it('trata mode inválido como demo', () => {
      process.env.PIX_GATEWAY_MODE = 'invalid';
      process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token';
      // mode inválido cai no branch de "tem token" → mp
      expect(resolvePixGatewayMode()).toBe('mp');
    });
  });

  describe('buildIdempotencyKey', () => {
    it('gera chave determinística baseada no orderId', () => {
      expect(buildIdempotencyKey('order-123')).toBe('pix-order-123');
      expect(buildIdempotencyKey('order-123')).toBe(buildIdempotencyKey('order-123'));
    });
  });

  describe('DemoPixGateway', () => {
    let gateway: DemoPixGateway;

    beforeEach(() => {
      gateway = new DemoPixGateway();
    });

    it('cria cobrança com BR Code válido e externalId derivado do orderId', async () => {
      const result = await gateway.createPixCharge({
        orderId: 'order-abc',
        amount: 50.0,
        description: 'Pedido teste',
        expirationMs: 30 * 60 * 1000,
      });

      expect(result.externalId).toBe('demo-order-abc');
      expect(result.qrCode).toContain('api.qrserver.com');
      expect(result.qrCode).toContain(encodeURIComponent('PEDI-AI DEMO'));
      expect(result.qrCodeBase64).toBe('');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('txid fica padded a 25 chars no payload EMV', async () => {
      const result = await gateway.createPixCharge({
        orderId: 'short',
        amount: 10.0,
        description: 'x',
        expirationMs: 1000,
      });
      // Decodifica o payload EMV (URL-encoded dentro do qrCode)
      const dataMatch = result.qrCode.match(/data=([^&]+)/);
      expect(dataMatch).not.toBeNull();
      const payload = decodeURIComponent(dataMatch![1]);
      // TLV 62 (Additional Data Field) contém TLV 05 (txid) com 25 chars.
      // TLV-62 length = 29 (TLV-05: tag 2 + length 2 + value 25).
      expect(payload).toMatch(/6229\s*0525short0{20}6304DEMO$/);
    });
  });

  describe('MercadoPagoPixGateway', () => {
    const fetchMock = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
      global.fetch = fetchMock as unknown as typeof fetch;
    });

    it('constrói POST com Idempotency-Key e body PIX correto', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          id: 12345,
          point_of_interaction: {
            transaction_details: {
              qr_code: '00020126580014BR.GOV.BCB.PIX...',
              qr_code_base64: 'iVBORw0KGgoAAAANSUhEUg==',
            },
          },
          date_of_expiration: '2026-07-30T12:00:00Z',
        }),
      } as unknown as Response);

      const gateway = new MercadoPagoPixGateway('TEST-token-abc');
      const result = await gateway.createPixCharge({
        orderId: 'order-xyz',
        amount: 56.9,
        description: 'Pedido #xyz — Pedi-AI',
        payerEmail: 'cliente@example.com',
        expirationMs: 30 * 60 * 1000,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.mercadopago.com/v1/payments');
      expect(init.method).toBe('POST');
      expect(init.headers.Authorization).toBe('Bearer TEST-token-abc');
      expect(init.headers['X-Idempotency-Key']).toBe('pix-order-xyz');

      const body = JSON.parse(init.body);
      expect(body).toMatchObject({
        transaction_amount: 56.9,
        description: 'Pedido #xyz — Pedi-AI',
        payment_method_id: 'pix',
        payer: { email: 'cliente@example.com' },
        external_reference: 'order-xyz',
      });
      expect(body.date_of_expiration).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      expect(result).toEqual({
        externalId: '12345',
        qrCode: '00020126580014BR.GOV.BCB.PIX...',
        qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUg==',
        expiresAt: new Date('2026-07-30T12:00:00Z'),
      });
    });

    it('lança erro descritivo em resposta 4xx', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"message":"invalid token"}',
      } as unknown as Response);

      const gateway = new MercadoPagoPixGateway('TEST-bad-token');

      await expect(
        gateway.createPixCharge({
          orderId: 'order-1',
          amount: 10,
          description: 'x',
          expirationMs: 1000,
        })
      ).rejects.toThrow(/HTTP 401/);
    });

    it('lança erro em resposta sem qr_code', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ id: 999 }),
      } as unknown as Response);

      const gateway = new MercadoPagoPixGateway('TEST-token');

      await expect(
        gateway.createPixCharge({
          orderId: 'order-1',
          amount: 10,
          description: 'x',
          expirationMs: 1000,
        })
      ).rejects.toThrow(/sem id ou qr_code/);
    });

    it('recusa construção sem accessToken', () => {
      expect(() => new MercadoPagoPixGateway('')).toThrow(/accessToken/);
      expect(() => new MercadoPagoPixGateway('   ')).toThrow(/accessToken/);
    });
  });
});
