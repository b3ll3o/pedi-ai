/**
 * Testes unitários do HealthGranularController
 *
 * @tags: @unit @health
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../../../common/prisma.service';
import { QueueService } from '../../../queues/queue.module';
import { HealthGranularController } from './health-granular.controller';

describe('HealthGranularController @unit @health', () => {
  let controller: HealthGranularController;
  let mockPrisma: jest.Mocked<Pick<PrismaService, '$queryRaw'>>;
  let mockQueue: jest.Mocked<Pick<QueueService, 'pingRedis' | 'getQueueStats'>>;

  beforeEach(async () => {
    mockPrisma = {
      $queryRaw: jest.fn(),
    };

    mockQueue = {
      pingRedis: jest.fn(),
      getQueueStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthGranularController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: QueueService, useValue: mockQueue },
      ],
    }).compile();

    controller = module.get<HealthGranularController>(HealthGranularController);
  });

  // ───────────────────────────────────────────────
  // GET /health/db
  // ───────────────────────────────────────────────

  describe('checkDb', () => {
    it('deve retornar 200 quando Postgres responde', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { version: 'PostgreSQL 16.2 on x86_64-pc-linux-gnu...' },
      ]);

      const result = await controller.checkDb();

      expect(result.status).toBe('ok');
      expect(result.component.name).toBe('postgres');
      expect(result.component.status).toBe('up');
      expect(result.component.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.component.metadata).toEqual({
        version: '16.2',
        connectionCount: expect.stringMatching(/active|idle/),
      });
    });

    it('deve lançar ServiceUnavailableException quando Postgres falha', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));

      await expect(controller.checkDb()).rejects.toThrow(ServiceUnavailableException);

      try {
        await controller.checkDb();
      } catch (err) {
        expect(err).toBeInstanceOf(ServiceUnavailableException);
        const response = (err as ServiceUnavailableException).getResponse() as {
          status: string;
          component: { status: string; error?: string };
        };
        expect(response.status).toBe('down');
        expect(response.component.status).toBe('down');
        expect(response.component.error).toBeTruthy();
      }
    });

    it('deve extrair versão do Postgres corretamente', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { version: 'PostgreSQL 15.5 (Ubuntu 15.5-1.pgdg20.04+1) on x86_64' },
      ]);

      const result = await controller.checkDb();
      expect(result.component.metadata?.['version']).toBe('15.5');
    });

    it('deve retornar "unknown" se versão não tiver match', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([{ version: 'Custom build' }]);

      const result = await controller.checkDb();
      expect(result.component.metadata?.['version']).toBe('unknown');
    });
  });

  // ───────────────────────────────────────────────
  // GET /health/redis
  // ───────────────────────────────────────────────

  describe('checkRedis', () => {
    it('deve retornar 200 quando Redis responde PONG', async () => {
      mockQueue.pingRedis.mockResolvedValueOnce({
        status: 'up',
        latencyMs: 5,
      });
      mockQueue.getQueueStats.mockResolvedValueOnce({
        waiting: 3,
        active: 1,
        completed: 100,
        failed: 2,
        delayed: 0,
        total: 6,
      });

      const result = await controller.checkRedis();

      expect(result.status).toBe('ok');
      expect(result.component.name).toBe('redis');
      expect(result.component.status).toBe('up');
      expect(result.component.metadata).toEqual({
        mode: 'active',
        waitingJobs: 3,
        activeJobs: 1,
        completedJobs: 100,
        failedJobs: 2,
      });
    });

    it('deve retornar "not_configured" quando Redis não tá habilitado', async () => {
      mockQueue.pingRedis.mockResolvedValueOnce(null);

      const result = await controller.checkRedis();

      expect(result.status).toBe('ok');
      expect(result.component.metadata).toEqual({
        mode: 'not_configured',
        note: 'Filas em modo no-op',
      });
    });

    it('deve lançar 503 quando Redis falha', async () => {
      mockQueue.pingRedis.mockResolvedValueOnce({
        status: 'down',
        latencyMs: 100,
        error: 'ECONNREFUSED',
      });

      await expect(controller.checkRedis()).rejects.toThrow(ServiceUnavailableException);
    });

    it('deve lidar com getQueueStats falhando (degrada graciosamente)', async () => {
      mockQueue.pingRedis.mockResolvedValueOnce({ status: 'up', latencyMs: 5 });
      mockQueue.getQueueStats.mockRejectedValueOnce(new Error('LLEN failed'));

      const result = await controller.checkRedis();

      expect(result.status).toBe('ok');
      expect(result.component.metadata).toEqual({ mode: 'active' });
      // Sem throwing
    });
  });

  // ───────────────────────────────────────────────
  // GET /health/full
  // ───────────────────────────────────────────────

  describe('full', () => {
    it('deve retornar "ok" quando TODOS componentes estão up', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { version: 'PostgreSQL 16.2' },
      ]);
      mockQueue.pingRedis.mockResolvedValueOnce({ status: 'up', latencyMs: 3 });
      mockQueue.getQueueStats.mockResolvedValueOnce({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        total: 0,
      });

      const result = await controller.full();

      expect(result.status).toBe('ok');
      expect(result.components).toHaveLength(2);
      expect(result.components.every((c) => c.status === 'up')).toBe(true);
      expect(result.environment).toBeDefined();
      expect(result.version).toBeDefined();
    });

    it('deve retornar "degraded" quando ALGUNS componentes estão down', async () => {
      mockPrisma.$queryRaw.mockResolvedValueOnce([
        { version: 'PostgreSQL 16.2' },
      ]);
      mockQueue.pingRedis.mockResolvedValueOnce({
        status: 'down',
        latencyMs: 100,
        error: 'ECONNREFUSED',
      });

      const result = await controller.full();

      expect(result.status).toBe('degraded');
      expect(result.components.find((c) => c.name === 'redis')?.status).toBe('down');
    });

    it('deve retornar "down" quando TODOS componentes estão down', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB down'));
      mockQueue.pingRedis.mockResolvedValueOnce({
        status: 'down',
        latencyMs: 100,
        error: 'Redis down',
      });

      const result = await controller.full();

      expect(result.status).toBe('down');
    });

    it('deve executar checks em paralelo (performance)', async () => {
      const dbDelay = 100;
      const redisDelay = 100;

      mockPrisma.$queryRaw.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve([{ version: 'PostgreSQL 16.2' }]),
              dbDelay
            )
          )
      );
      mockQueue.pingRedis.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ status: 'up' as const, latencyMs: redisDelay }),
              redisDelay
            )
          )
      );

      const start = Date.now();
      await controller.full();
      const elapsed = Date.now() - start;

      // Se fosse serial, seria ~200ms. Em paralelo deve ser ~100-110ms.
      expect(elapsed).toBeLessThan(dbDelay + redisDelay + 50);
    });
  });

  // ───────────────────────────────────────────────
  // Sanitização de erros (LGPD / segurança)
  // ───────────────────────────────────────────────

  describe('sanitização de erros', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('deve MASCARAR IPs em produção', async () => {
      process.env.NODE_ENV = 'production';

      mockPrisma.$queryRaw.mockRejectedValueOnce(
        new Error("Can't reach database server at '192.168.1.100:5432'")
      );

      try {
        await controller.checkDb();
      } catch (err) {
        const response = (err as ServiceUnavailableException).getResponse() as {
          component: { error: string };
        };
        expect(response.component.error).not.toContain('192.168.1.100');
        expect(response.component.error).toContain('***');
      }
    });

    it('deve MASCARAR hostnames AWS em produção', async () => {
      process.env.NODE_ENV = 'production';

      mockPrisma.$queryRaw.mockRejectedValueOnce(
        new Error("Can't reach rds-prod.cluster-xyz.us-east-1.rds.amazonaws.com")
      );

      try {
        await controller.checkDb();
      } catch (err) {
        const response = (err as ServiceUnavailableException).getResponse() as {
          component: { error: string };
        };
        expect(response.component.error).not.toContain('amazonaws.com');
      }
    });

    it('deve MOSTRAR erro completo em development (debugging)', async () => {
      process.env.NODE_ENV = 'development';

      mockPrisma.$queryRaw.mockRejectedValueOnce(
        new Error('Detailed error with host: db.example.com')
      );

      try {
        await controller.checkDb();
      } catch (err) {
        const response = (err as ServiceUnavailableException).getResponse() as {
          component: { error: string };
        };
        expect(response.component.error).toContain('db.example.com');
      }
    });

    it('deve TRUNCAR mensagens muito longas', async () => {
      process.env.NODE_ENV = 'production';

      const longError = 'X'.repeat(1000);
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error(longError));

      try {
        await controller.checkDb();
      } catch (err) {
        const response = (err as ServiceUnavailableException).getResponse() as {
          component: { error: string };
        };
        expect(response.component.error.length).toBeLessThanOrEqual(200);
      }
    });
  });
});