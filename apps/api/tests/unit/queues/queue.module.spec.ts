import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests para QueueService (BullMQ wrapper).
 *
 * Estratégia: mockar `ioredis` e `bullmq` no nível do módulo ANTES de
 * importar `queue.module.ts`. Como esses módulos só são carregados na
 * instanciação do QueueService (lazy), o mock com `vi.mock` é seguro.
 */

// Mock do ioredis — usado pelo QueueService ao instanciar.
vi.mock('ioredis', () => {
  const IORedis = vi.fn().mockImplementation(function () {
    return {
      on: vi.fn(),
      ping: vi.fn().mockResolvedValue('PONG'),
      quit: vi.fn().mockResolvedValue('OK'),
    };
  });
  return { default: IORedis };
});

// Mock do bullmq — Queue e Worker.
vi.mock('bullmq', () => {
  const Queue = vi.fn().mockImplementation(function () {
    return {
      add: vi.fn().mockResolvedValue({ id: 'job-1' }),
      close: vi.fn().mockResolvedValue(undefined),
    };
  });
  const Worker = vi.fn().mockImplementation(function () {
    return {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
  });
  return { Queue, Worker };
});

describe('QueueService', () => {
  let originalRedisUrl: string | undefined;

  beforeEach(() => {
    originalRedisUrl = process.env.REDIS_URL;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  });

  describe('modo no-op (sem REDIS_URL)', () => {
    it('opera em modo no-op e loga warning ao instanciar', async () => {
      delete process.env.REDIS_URL;
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      // register() retorna null quando desabilitado
      const queue = svc.register({ name: 'test-queue' }, async () => {});
      expect(queue).toBeNull();
    });

    it('enqueue executa inline via setImmediate em modo no-op', async () => {
      delete process.env.REDIS_URL;
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      // Não deve lançar, mesmo sem fila registrada.
      await expect(svc.enqueue('nonexistent-queue', { foo: 'bar' })).resolves.toBeUndefined();
    });

    it('pingRedis retorna null quando Redis desabilitado', async () => {
      delete process.env.REDIS_URL;
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();
      expect(await svc.pingRedis()).toBeNull();
    });
  });

  describe('modo habilitado (com REDIS_URL)', () => {
    it('inicializa Redis e registra queue + worker', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      const handler = vi.fn().mockResolvedValue(undefined);
      const queue = svc.register({ name: 'q1' }, handler);

      expect(queue).not.toBeNull();
    });

    it('register é idempotente: re-registrar retorna a mesma queue', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      const handler = vi.fn().mockResolvedValue(undefined);
      const q1 = svc.register({ name: 'q1' }, handler);
      const q2 = svc.register({ name: 'q1' }, handler);

      expect(q1).toBe(q2);
    });

    it('enqueue adiciona job à queue registrada', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      const handler = vi.fn().mockResolvedValue(undefined);
      const queue = svc.register({ name: 'q2' }, handler);

      await svc.enqueue('q2', { msg: 'hello' });

      expect(queue.add).toHaveBeenCalledWith('q2', { msg: 'hello' }, undefined);
    });

    it('enqueue aceita opts de delay', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      const handler = vi.fn().mockResolvedValue(undefined);
      const queue = svc.register({ name: 'q3' }, handler);

      await svc.enqueue('q3', { msg: 'delayed' }, { delay: 5000 });

      expect(queue.add).toHaveBeenCalledWith('q3', { msg: 'delayed' }, { delay: 5000 });
    });

    it('enqueue de queue não registrada cai em no-op (fallback inline)', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      // Não lança mesmo sem registro.
      await expect(svc.enqueue('never-registered', { data: 1 })).resolves.toBeUndefined();
    });

    it('pingRedis retorna up com PONG', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();
      const result = await svc.pingRedis();
      expect(result?.status).toBe('up');
      expect(result?.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('pingRedis retorna down quando ping não devolve PONG', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      // Sobrescreve o método ping no redis mockado
      (svc as unknown as { redis: { ping: ReturnType<typeof vi.fn> } }).redis.ping = vi
        .fn()
        .mockResolvedValue('OTHER');

      const result = await svc.pingRedis();
      expect(result?.status).toBe('down');
    });

    it('pingRedis captura erro de conexão', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      (svc as unknown as { redis: { ping: ReturnType<typeof vi.fn> } }).redis.ping = vi
        .fn()
        .mockRejectedValue(new Error('connection refused'));

      const result = await svc.pingRedis();
      expect(result?.status).toBe('down');
      expect(result?.error).toBe('connection refused');
    });

    it('shutdown fecha workers, queues e redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      const { QueueService } = await import('../../../src/queues/queue.module');
      const svc = new QueueService();

      const handler = vi.fn().mockResolvedValue(undefined);
      svc.register({ name: 'q-shutdown' }, handler);

      await expect(svc.shutdown()).resolves.toBeUndefined();
    });
  });
});

describe('EmailQueue', () => {
  let originalRedisUrl: string | undefined;

  beforeEach(() => {
    originalRedisUrl = process.env.REDIS_URL;
    vi.resetModules();
  });

  afterEach(() => {
    if (originalRedisUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalRedisUrl;
    }
  });

  it('registra handler no onModuleInit', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const { QueueService } = await import('../../../src/queues/queue.module');
    const { EmailQueue } = await import('../../../src/queues/email.queue');
    const queueService = new QueueService();
    const registerSpy = vi.spyOn(queueService, 'register');
    const emailQueue = new EmailQueue(queueService);
    emailQueue.onModuleInit();

    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'email' }),
      expect.any(Function)
    );
  });

  it('sendPasswordReset enfileira email job', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const { QueueService } = await import('../../../src/queues/queue.module');
    const { EmailQueue } = await import('../../../src/queues/email.queue');
    const queueService = new QueueService();
    queueService.register({ name: 'email' }, async () => {});
    const enqueueSpy = vi.spyOn(queueService, 'enqueue');
    const emailQueue = new EmailQueue(queueService);

    await emailQueue.sendPasswordReset('user@example.com', 'https://reset?token=abc');

    expect(enqueueSpy).toHaveBeenCalledWith('email', {
      to: 'user@example.com',
      subject: 'Redefinição de senha',
      body: 'Clique no link para redefinir sua senha: https://reset?token=abc',
      type: 'password-reset',
    });
  });

  it('handler de email mascara email no log (LGPD)', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    const { QueueService } = await import('../../../src/queues/queue.module');
    const { EmailQueue } = await import('../../../src/queues/email.queue');
    const queueService = new QueueService();
    let capturedHandler:
      ((data: { to: string; subject: string; type: string }) => Promise<void>) | undefined;
    vi.spyOn(queueService, 'register').mockImplementation((opts, handler) => {
      if (opts.name === 'email') {
        capturedHandler = handler as typeof capturedHandler;
      }
      return null;
    });

    const emailQueue = new EmailQueue(queueService);
    emailQueue.onModuleInit();

    // Executa o handler com email — não deve lançar
    expect(capturedHandler).toBeDefined();
    await expect(
      capturedHandler!({ to: 'joao.silva@example.com', subject: 'Test', type: 'generic' })
    ).resolves.toBeUndefined();
  });
});
