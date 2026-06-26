import * as crypto from 'crypto';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PaymentsController } from '../../../src/payments/payments.controller';
import { PaymentsService } from '../../../src/payments/payments.service';

/**
 * Testa o esquema de assinatura HMAC v1 do Mercado Pago:
 *  - Header `x-signature: t=<ts>,v1=<hex>`
 *  - Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` + raw body
 *  - HMAC-SHA256(secret, manifest).hex()
 */
describe('PaymentsController — HMAC v1 webhook validation', () => {
  const SECRET = 'mp_webhook_secret_test_12345_abcdef';
  const eventId = '12345';
  const requestId = 'req-abc-def';
  let ts: string;
  let body: string;
  let rawBody: Buffer;
  let signature: string;

  let controller: PaymentsController;
  let mockService: { handleWebhook: ReturnType<typeof vi.fn> };

  function makeSignature(t: string, manifest: string): string {
    const v1 = crypto.createHmac('sha256', SECRET).update(manifest).digest('hex');
    return `t=${t},v1=${v1}`;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MP_WEBHOOK_SECRET = SECRET;
    ts = Math.floor(Date.now() / 1000).toString();
    body = JSON.stringify({ id: eventId, type: 'payment', data: { id: 'mp-pay-1' } });
    rawBody = Buffer.from(body, 'utf8');
    const manifest = `id:${eventId};request-id:${requestId};ts:${ts};${body}`;
    signature = makeSignature(ts, manifest);

    mockService = {
      handleWebhook: vi.fn().mockResolvedValue({ status: 'success', orderId: 'order-1' }),
    };
    controller = new PaymentsController(mockService as unknown as PaymentsService);
  });

  it('rejects missing signature header', async () => {
    await expect(
      controller.handlePixWebhook(
        { ip: '209.225.49.25', rawBody } as never,
        undefined,
        requestId,
        JSON.parse(body)
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects malformed signature header', async () => {
    await expect(
      controller.handlePixWebhook(
        { ip: '209.225.49.25', rawBody } as never,
        'not-a-valid-signature',
        requestId,
        JSON.parse(body)
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects signature with wrong secret', async () => {
    const manifest = `id:${eventId};request-id:${requestId};ts:${ts};${body}`;
    const v1 = crypto.createHmac('sha256', 'wrong-secret').update(manifest).digest('hex');
    const bad = `t=${ts},v1=${v1}`;

    await expect(
      controller.handlePixWebhook(
        { ip: '209.225.49.25', rawBody } as never,
        bad,
        requestId,
        JSON.parse(body)
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects signature with mutated body', async () => {
    const tamperedRawBody = Buffer.from(body + ' ', 'utf8');

    await expect(
      controller.handlePixWebhook(
        { ip: '209.225.49.25', rawBody: tamperedRawBody } as never,
        signature,
        requestId,
        JSON.parse(body)
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects timestamp outside skew window', async () => {
    const oldTs = (Math.floor(Date.now() / 1000) - 600).toString(); // 10 min atrás
    const manifest = `id:${eventId};request-id:${requestId};ts:${oldTs};${body}`;
    const oldSig = makeSignature(oldTs, manifest);

    await expect(
      controller.handlePixWebhook(
        { ip: '209.225.49.25', rawBody } as never,
        oldSig,
        requestId,
        JSON.parse(body)
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects missing raw body', async () => {
    await expect(
      controller.handlePixWebhook(
        { ip: '209.225.49.25' } as never,
        signature,
        requestId,
        JSON.parse(body)
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects webhook from unauthorized IP', async () => {
    await expect(
      controller.handlePixWebhook(
        { ip: '8.8.8.8', rawBody } as never,
        signature,
        requestId,
        JSON.parse(body)
      )
    ).rejects.toThrow(UnauthorizedException);
  });
});
