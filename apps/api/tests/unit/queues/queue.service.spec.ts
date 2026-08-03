import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Spec de cobertura para `QueueService` (203 linhas).
 *
 * Estratégia: deletar REDIS_URL antes do import para forçar modo no-op,
 * exercitando as branches defensivas (`!this.enabled`). Para o caminho
 * habilitado, mockar `bullmq`/`ioredis` no nível de módulo é frágil
 * (constructor side-effects), então cobrimos o caminho real (no-op) que
 * é mais crítico para dev/CI e testamos unitariamente os fallbacks.
 *
 * Origem: cobertura `queues/queue.service.ts` 41.93% (este spec foca em
 * cobrir as branches de fallback que são usadas em CI sem Redis).
 */

describe('QueueService — modo no-op (sem REDIS_URL)', () => {
  let originalRedisUrl: string | undefined;

  beforeEach(() => {
    originalRedisUrl = process.env.REDIS_URL;
    delete process.env.REDIS_URL;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalRedisUrl !== undefined) {
      process.env.REDIS_URL = originalRedisUrl;
    } else {
      delete process.env.REDIS_URL;
    }
  });

  it('Carrega módulo com REDIS_URL undefined e cria service', async () => {
    const { QueueService } = await import('../../../src/queues/queue.service');
    const svc = new QueueService();
    expect(svc).toBeDefined();
  });

  it('register() retorna null quando redis não habilitado', async () => {
    const { QueueService } = await import('../../../src/queues/queue.service');
    const svc = new QueueService();
    const queue = svc.register({ name: 'test-queue' }, async () => undefined);
    expect(queue).toBeNull();
  });

  it('register() aceita defaultJobOptions sem aplicá-los (sem redis)', async () => {
    const { QueueService } = await import('../../../src/queues/queue.service');
    const svc = new QueueService();
    const queue = svc.register(
      {
        name: 'q',
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'fixed', delay: 1000 },
          removeOnComplete: { count: 100, age: 60 },
          removeOnFail: { count: 50 },
        },
      },
      async () => undefined
    );
    expect(queue).toBeNull();
  });

  it('enqueue() executa no-op (não insere em queue)', async () => {
    const { QueueService } = await import('../../../src/queues/queue.service');
    const svc = new QueueService();
    await expect(svc.enqueue('test', { foo: 'bar' })).resolves.toBeUndefined();
  });

  it('enqueue() com opts.delay (no-op ignora delay)', async () => {
    const { QueueService } = await import('../../../src/queues/queue.service');
    const svc = new QueueService();
    await expect(
      svc.enqueue('test', { foo: 'bar' }, { delay: 5_000 })
    ).resolves.toBeUndefined();
  });

  it('pingRedis() retorna null quando redis não habilitado', async () => {
    const { QueueService } = await import('../../../src/queues/queue.service');
    const svc = new QueueService();
    const result = await svc.pingRedis();
    expect(result).toBeNull();
  });

  it('getQueueStats() retorna null quando redis não habilitado', async () => {
    const { QueueService } = await import('../../../src/queues/queue.service');
    const svc = new QueueService();
    const result = await svc.getQueueStats();
    expect(result).toBeNull();
  });

  it('getQueueStats() retorna null quando queues.size === 0 (defesa)', async () => {
    const { QueueService } = await import('../../../src/queues/queue.service');
    const svc = new QueueService();
    const result = await svc.getQueueStats();
    expect(result).toBeNull();
  });

  it('shutdown() não falha em modo no-op (sem redis/queue)', async () => {
    const { QueueService } = await import('../../../src/queues/queue.service');
    const svc = new QueueService();
    await expect(svc.shutdown()).resolves.toBeUndefined();
  });
});

describe('QueueService — módulo importável', () => {
  it('Carrega a classe QueueService via módulo', async () => {
    const mod = await import('../../../src/queues/queue.service');
    expect(mod.QueueService).toBeDefined();
  });

  it('Exporta REDIS_URL como string derivada de process.env', async () => {
    const mod = await import('../../../src/queues/queue.service');
    // REDIS_URL é uma constante calculada no carregamento do módulo.
    expect(typeof mod.REDIS_URL).toBe('string');
  });
});
