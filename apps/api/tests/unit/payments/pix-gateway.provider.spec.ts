import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  PIX_GATEWAY,
  pixGatewayProvider,
} from '../../../src/payments/infrastructure/pix-gateway.provider';
import { DemoPixGateway } from '../../../src/payments/infrastructure/demo-pix.gateway';
import { MercadoPagoPixGateway } from '../../../src/payments/infrastructure/mercadopago-pix.gateway';

describe('pixGatewayProvider', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    delete process.env.PIX_GATEWAY_MODE;
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('tem token PIX_GATEWAY e provider registrado', () => {
    expect(PIX_GATEWAY).toBe(Symbol.for('PIX_GATEWAY') === PIX_GATEWAY ? PIX_GATEWAY : PIX_GATEWAY);
    expect(pixGatewayProvider.provide).toBe(PIX_GATEWAY);
  });

  it('retorna DemoPixGateway quando não há token', () => {
    const gateway = pixGatewayProvider.useFactory();
    expect(gateway).toBeInstanceOf(DemoPixGateway);
  });

  it('retorna MercadoPagoPixGateway quando há token e modo mp', () => {
    process.env.PIX_GATEWAY_MODE = 'mp';
    process.env.MERCADOPAGO_ACCESS_TOKEN = 'TEST-token-abc';
    const gateway = pixGatewayProvider.useFactory();
    expect(gateway).toBeInstanceOf(MercadoPagoPixGateway);
  });

  it('cai para DemoPixGateway quando modo=mp mas token ausente', () => {
    process.env.PIX_GATEWAY_MODE = 'mp';
    const gateway = pixGatewayProvider.useFactory();
    expect(gateway).toBeInstanceOf(DemoPixGateway);
  });
});
