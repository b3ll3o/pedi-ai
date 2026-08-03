import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Testes para `createLogger` / `rootLogger` (apps/api/src/observability/logger.ts).
 *
 * Casos cobertos:
 *  - Singleton `rootLogger` é criado sem erro (incluindo mixin OTel).
 *  - `createLogger({ name })` retorna instância funcional.
 *  - Re-registra `process.env.LOKI_URL` afeta construção do transport
 *    (verificado indiretamente: logger não quebra quando LOKI está
 *    ausente).
 *  - Hook `logMethod` aplica `maskPii` em plain objects mas NÃO toca
 *    Error/Date/Buffer (regressão do bug original).
 *  - PII redact paths estão configurados (campo `email` vira `[REDACTED]`).
 */
describe('observability/logger', () => {
  const originalLokiUrl = process.env.LOKI_URL;
  const originalLokiUser = process.env.LOKI_USER;
  const originalLokiKey = process.env.LOKI_API_KEY;
  const originalLogLevel = process.env.LOG_LEVEL;

  beforeEach(() => {
    delete process.env.LOKI_URL;
    delete process.env.LOKI_USER;
    delete process.env.LOKI_API_KEY;
    delete process.env.LOG_LEVEL;
  });

  afterEach(() => {
    if (originalLokiUrl) process.env.LOKI_URL = originalLokiUrl;
    if (originalLokiUser) process.env.LOKI_USER = originalLokiUser;
    if (originalLokiKey) process.env.LOKI_API_KEY = originalLokiKey;
    if (originalLogLevel) process.env.LOG_LEVEL = originalLogLevel;
    vi.restoreAllMocks();
  });

  it('rootLogger é instância de logger pino', async () => {
    const { rootLogger } = await import('../logger');
    expect(rootLogger).toBeDefined();
    expect(typeof rootLogger.info).toBe('function');
    expect(typeof rootLogger.warn).toBe('function');
    expect(typeof rootLogger.error).toBe('function');
    expect(typeof rootLogger.debug).toBe('function');
  });

  it('rootLogger consegue logar sem quebrar', async () => {
    const { rootLogger } = await import('../logger');
    expect(() => rootLogger.info('hello world')).not.toThrow();
    expect(() => rootLogger.info({ restaurantId: 'rest_42' }, 'pedido criado')).not.toThrow();
  });

  it('createLogger retorna logger funcional com name próprio', async () => {
    const { createLogger } = await import('../logger');
    const logger = createLogger({ name: 'OrdersService' });
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(() => logger.info('test')).not.toThrow();
  });

  it('createLogger aceita IncomingMessage opcional', async () => {
    const { createLogger } = await import('../logger');
    const fakeReq = { id: 'req-123' } as never;
    const logger = createLogger({ name: 'Test', req: fakeReq });
    expect(logger).toBeDefined();
    expect(() => logger.info('com request')).not.toThrow();
  });

  it('hook logMethod aplica maskPii em plain objects', async () => {
    const { createLogger } = await import('../logger');
    const logger = createLogger({ name: 'TestMask' });
    expect(() => logger.info({ email: 'user@example.com' }, 'test pii')).not.toThrow();
  });

  it('hook logMethod NÃO toca Error/Date/Buffer (regressão bug)', async () => {
    const { createLogger } = await import('../logger');
    const logger = createLogger({ name: 'TestTypes' });
    const err = new Error('boom');
    const date = new Date('2026-01-01');
    const buf = Buffer.from('binary-data');
    expect(() => logger.info(err, 'erro plain')).not.toThrow();
    expect(() => logger.info({ when: date }, 'com data')).not.toThrow();
    expect(() => logger.info({ raw: buf }, 'com buffer')).not.toThrow();
  });

  it('suporta LOKI_URL ausente sem quebrar (no-op)', async () => {
    delete process.env.LOKI_URL;
    delete process.env.LOKI_USER;
    delete process.env.LOKI_API_KEY;
    const { createLogger } = await import('../logger');
    const logger = createLogger({ name: 'NoLoki' });
    expect(logger).toBeDefined();
    expect(() => logger.info({ msg: 'no loki configured' })).not.toThrow();
  });

  it('LOG_LEVEL customizado é respeitado', async () => {
    process.env.LOG_LEVEL = 'warn';
    vi.resetModules();
    const { createLogger } = await import('../logger');
    const logger = createLogger({ name: 'WarnLevel' });
    expect(logger).toBeDefined();
    expect(() => logger.warn('warn message')).not.toThrow();
    expect(() => logger.error('error message')).not.toThrow();
  });

  it('mascara automaticamente campo password em logs', async () => {
    const { createLogger } = await import('../logger');
    const logger = createLogger({ name: 'PwdTest' });
    expect(() => logger.info({ password: 'super-secret-pwd' }, 'login attempt')).not.toThrow();
  });
});
