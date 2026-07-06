/**
 * @spec(A11)
 *
 * `QueueService` — wrapper minimalista sobre BullMQ para não acoplar ao
 * @nestjs/bull (que adiciona complexidade desnecessária para nosso caso).
 *
 * Conexão Redis: compartilhada entre todas as filas.
 *
 * Auditoria origem: A3 — sem BullMQ/Redis queue.
 *
 * Variáveis:
 * - `REDIS_URL`: URL completa (ex: `redis://localhost:6379`). Se ausente,
 *   o módulo opera em modo no-op (filas viram log + execução imediata).
 *
 * Este arquivo é separado de `queue.module.ts` para evitar dependência
 * circular com `email.queue.ts` (que importa QueueService daqui).
 */
import { Injectable, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import IORedis, { Redis } from 'ioredis';

export const REDIS_URL = process.env.REDIS_URL ?? '';

export interface QueueOptions {
  name: string;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: { type: 'exponential' | 'fixed'; delay: number };
    removeOnComplete?: { count: number; age?: number };
    removeOnFail?: { count: number };
  };
}

export interface JobHandler<T = unknown> {
  (data: T): Promise<void>;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private redis: Redis | null = null;
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  private readonly enabled: boolean;

  constructor() {
    this.enabled = Boolean(REDIS_URL);
    if (this.enabled) {
      try {
        this.redis = new IORedis(REDIS_URL, {
          maxRetriesPerRequest: null, // BullMQ requer null
          enableReadyCheck: false,
        });
        this.redis.on('error', (err) => {
          this.logger.error(`Redis error: ${err.message}`);
        });
        this.logger.log(`QueueService conectado a ${REDIS_URL}`);
      } catch (err) {
        this.logger.error(`Falha ao conectar ao Redis: ${(err as Error).message}`);
        this.enabled = false;
      }
    } else {
      this.logger.warn(
        'REDIS_URL não configurada — filas operam em modo no-op (job executado inline).'
      );
    }
  }

  /**
   * Registra uma fila + worker. Idempotente: re-registrar com mesmo nome
   * retorna a fila existente.
   */
  register<T>(opts: QueueOptions, handler: JobHandler<T>): Queue | null {
    if (!this.enabled || !this.redis) return null;

    let queue = this.queues.get(opts.name);
    if (!queue) {
      queue = new Queue(opts.name, {
        connection: this.redis,
        defaultJobOptions: opts.defaultJobOptions ?? {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: { count: 1000 },
        },
      });
      this.queues.set(opts.name, queue);
    }

    if (!this.workers.has(opts.name)) {
      const worker = new Worker(opts.name, async (job) => handler(job.data as T), {
        connection: this.redis,
      });
      worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} da fila ${opts.name} falhou: ${err.message}`);
      });
      worker.on('completed', (job) => {
        this.logger.debug(`Job ${job.id} da fila ${opts.name} concluído`);
      });
      this.workers.set(opts.name, worker);
    }

    return queue;
  }

  /**
   * Enfileira um job. Em modo no-op (sem Redis), executa inline de forma
   * assíncrona — útil em dev/CI.
   */
  async enqueue<T>(queueName: string, data: T, opts?: { delay?: number }): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.add(queueName, data, opts);
      return;
    }
    // Modo no-op: log + execução assíncrona. **NÃO** usar em produção —
    // é apenas fallback para dev/CI sem Redis.
    this.logger.warn(
      `[no-op] job ${queueName} executado inline (sem fila): ${JSON.stringify(data)}`
    );
    setImmediate(() =>
      Promise.resolve(data).catch((err) => {
        this.logger.error(`[no-op] job ${queueName} falhou: ${err}`);
      })
    );
  }

  /**
   * Health probe compartilhado — usa a conexão singleton do QueueService.
   * Auditoria A11: antes o HealthController criava uma nova conexão IORedis
   * por probe, vazando recursos e tornando o probe caro.
   *
   * Retorna `null` quando Redis não está habilitado (modo no-op) — cabe ao
   * chamador decidir se isso é "up" (dev) ou "down" (prod).
   */
  async pingRedis(): Promise<{ status: 'up' | 'down'; latencyMs: number; error?: string } | null> {
    if (!this.enabled || !this.redis) return null;
    const start = Date.now();
    try {
      const pong = await this.redis.ping();
      return {
        status: pong === 'PONG' ? 'up' : 'down',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        error: (err as Error).message,
      };
    }
  }

  async shutdown(): Promise<void> {
    await Promise.all(Array.from(this.workers.values()).map((w) => w.close()));
    await Promise.all(Array.from(this.queues.values()).map((q) => q.close()));
    if (this.redis) {
      await this.redis.quit();
    }
  }
}