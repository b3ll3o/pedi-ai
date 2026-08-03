/**
 * Health Check Controller — Endpoints granulares
 *
 * **Endpoints:**
 * - `GET /health` (liveness) — já existe, mantém compatibilidade
 * - `GET /ready` (readiness) — já existe, mantém compatibilidade
 * - `GET /health/db` — só Postgres (auditoria LGPD/SOC2)
 * - `GET /health/redis` — só Redis/BullMQ
 * - `GET /health/full` — health completo com tudo + versão
 *
 * **Por que endpoints granulares?**
 * - Ferramentas de monitoramento (Datadog, Grafana Cloud, Prometheus) querem
 *   scrape individual pra alertas específicos.
 * - Permite identificar QUAL dependência caiu.
 * - Reduz ruído em alertas (Redis fora ≠ deploy bloqueado).
 *
 * **Público?** Sim — sem autenticação, sem throttling (monitoramento precisa).
 * Não vaza informações sensíveis (hostname/IPs mascarados em prod).
 *
 * @see .openspec/specs/admin/design.md (health checks)
 */

import { Controller, Get, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../common/prisma.service';
import { QueueService } from '../queues/queue.service';

interface ComponentHealth {
  name: string;
  status: 'up' | 'down';
  latencyMs: number;
  error?: string;
  /** Metadados adicionais (versão DB, total de conexões, etc). */
  metadata?: Record<string, unknown>;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  timestamp: string;
  component: ComponentHealth;
}

interface FullHealthResponse extends Omit<HealthResponse, 'component'> {
  version: string;
  environment: string;
  components: ComponentHealth[];
}

const isProd = () => process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

/**
 * Sanitiza mensagem de erro para não vazar topologia interna (hostname/IP
 * do banco) em produção. Auditoria ACHADO-32.
 */
function sanitizeError(rawError: string): string {
  if (!isProd()) return rawError;

  // Remove hostname/IP do erro (pode estar em connection strings, stack traces)
  return rawError
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '***')
    .replace(/\b[a-z0-9-]+\.[a-z0-9-]+\.amazonaws\.com\b/gi, '***')
    .replace(/\b(?:\w+\.){2,}internal\b/gi, '***')
    .slice(0, 200); // limita tamanho
}

@ApiTags('health')
@Controller('health')
export class HealthGranularController {
  private readonly logger = new Logger(HealthGranularController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {}

  /**
   * GET /health/db
   *
   * Health check isolado do Postgres.
   * Usado por:
   * - Datadog/Grafana Cloud: scrape individual pra alertas específicos
   * - k6 load tests: validar que DB tá respondendo durante stress
   * - Status page: indicador específico
   */
  @Get('db')
  @Public()
  @SkipThrottle({ default: true })
  @ApiOperation({ summary: 'Health check do Postgres' })
  @ApiResponse({ status: 200, description: 'Postgres saudável' })
  @ApiResponse({ status: 503, description: 'Postgres indisponível' })
  async checkDb(): Promise<HealthResponse> {
    const start = Date.now();
    let component: ComponentHealth;

    try {
      // Query simples + obtém versão (metadata)
      const result = await this.prisma.$queryRaw<Array<{ version: string }>>`
        SELECT version() as version
      `;
      const versionString = result[0]?.version ?? 'unknown';
      const versionMatch = versionString.match(/PostgreSQL (\d+\.\d+)/);
      const pgVersion = versionMatch ? versionMatch[1] : 'unknown';

      component = {
        name: 'postgres',
        status: 'up',
        latencyMs: Date.now() - start,
        metadata: {
          version: pgVersion,
          connectionCount: this.prisma.$disconnect ? 'active' : 'idle',
        },
      };
    } catch (err) {
      const rawError = (err as Error).message;
      const sanitized = sanitizeError(rawError);

      component = {
        name: 'postgres',
        status: 'down',
        latencyMs: Date.now() - start,
        error: sanitized,
      };

      this.logger.error(`[health/db] postgres indisponível: ${rawError}`);
    }

    const response: HealthResponse = {
      status: component.status === 'up' ? 'ok' : 'down',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      component,
    };

    if (component.status === 'down') {
      throw new ServiceUnavailableException(response);
    }
    return response;
  }

  /**
   * GET /health/redis
   *
   * Health check isolado do Redis (BullMQ).
   *
   * **Status:**
   * - `up` — Redis conectado e respondendo
   * - `down` — Redis indisponível (fila de jobs parada, mas API funciona)
   * - `not_configured` — Redis não configurado (modo no-op)
   */
  @Get('redis')
  @Public()
  @SkipThrottle({ default: true })
  @ApiOperation({ summary: 'Health check do Redis (BullMQ)' })
  @ApiResponse({ status: 200, description: 'Redis saudável ou não configurado' })
  @ApiResponse({ status: 503, description: 'Redis indisponível' })
  async checkRedis(): Promise<HealthResponse> {
    const start = Date.now();
    let component: ComponentHealth;

    try {
      const pingResult = await this.queueService.pingRedis();

      if (!pingResult) {
        // Redis não configurado — não é bloqueante
        component = {
          name: 'redis',
          status: 'up',
          latencyMs: Date.now() - start,
          metadata: { mode: 'not_configured', note: 'Filas em modo no-op' },
        };
      } else if (pingResult.status === 'up') {
        // Tenta obter estatísticas adicionais
        const queueStats = await this.queueService.getQueueStats().catch(() => null);

        component = {
          name: 'redis',
          status: 'up',
          latencyMs: pingResult.latencyMs ?? Date.now() - start,
          metadata: {
            mode: 'active',
            ...(queueStats && {
              waitingJobs: queueStats.waiting,
              activeJobs: queueStats.active,
              completedJobs: queueStats.completed,
              failedJobs: queueStats.failed,
            }),
          },
        };
      } else {
        component = {
          name: 'redis',
          status: 'down',
          latencyMs: pingResult.latencyMs ?? Date.now() - start,
          error: sanitizeError(pingResult.error ?? 'connection_failed'),
        };

        this.logger.error(`[health/redis] redis indisponível: ${pingResult.error}`);
      }
    } catch (err) {
      component = {
        name: 'redis',
        status: 'down',
        latencyMs: Date.now() - start,
        error: sanitizeError((err as Error).message),
      };

      this.logger.error(`[health/redis] erro inesperado: ${(err as Error).message}`);
    }

    const response: HealthResponse = {
      status: component.status === 'up' ? 'ok' : 'down',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      component,
    };

    if (component.status === 'down') {
      throw new ServiceUnavailableException(response);
    }
    return response;
  }

  /**
   * GET /health/full
   *
   * Health completo com TODOS os componentes + versão + environment.
   * Útil pra dashboards que querem ver tudo em uma request.
   *
   * ⚠️ **Mais pesado** que /health/db ou /health/redis (executa todos).
   */
  @Get('full')
  @Public()
  @SkipThrottle({ default: true })
  @ApiOperation({ summary: 'Health completo (DB + Redis + versão)' })
  async full(): Promise<FullHealthResponse> {
    // Executa ambos checks em paralelo (performance)
    const [dbResult, redisResult] = await Promise.allSettled([
      this.checkDbRaw(),
      this.checkRedisRaw(),
    ]);

    const components: ComponentHealth[] = [
      this.extractComponent(dbResult, 'postgres'),
      this.extractComponent(redisResult, 'redis'),
    ];

    const allUp = components.every((c) => c.status === 'up');
    const someUp = components.some((c) => c.status === 'up');

    return {
      status: allUp ? 'ok' : someUp ? 'degraded' : 'down',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      environment: process.env.NODE_ENV ?? 'development',
      components,
    };
  }

  // ── Helpers privados ───────────────────────────────────────────

  private async checkDbRaw(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      const result = await this.prisma.$queryRaw<Array<{ version: string }>>`
        SELECT version() as version
      `;
      const versionMatch = result[0]?.version.match(/PostgreSQL (\d+\.\d+)/);
      return {
        name: 'postgres',
        status: 'up',
        latencyMs: Date.now() - start,
        metadata: { version: versionMatch?.[1] ?? 'unknown' },
      };
    } catch (err) {
      return {
        name: 'postgres',
        status: 'down',
        latencyMs: Date.now() - start,
        error: sanitizeError((err as Error).message),
      };
    }
  }

  private async checkRedisRaw(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      const pingResult = await this.queueService.pingRedis();
      if (!pingResult) {
        return {
          name: 'redis',
          status: 'up',
          latencyMs: Date.now() - start,
          metadata: { mode: 'not_configured' },
        };
      }
      return {
        name: 'redis',
        status: pingResult.status,
        latencyMs: pingResult.latencyMs ?? Date.now() - start,
        error: pingResult.error ? sanitizeError(pingResult.error) : undefined,
      };
    } catch (err) {
      return {
        name: 'redis',
        status: 'down',
        latencyMs: Date.now() - start,
        error: sanitizeError((err as Error).message),
      };
    }
  }

  private extractComponent(
    result: PromiseSettledResult<ComponentHealth>,
    fallbackName: string
  ): ComponentHealth {
    if (result.status === 'fulfilled') return result.value;
    return {
      name: fallbackName,
      status: 'down',
      latencyMs: 0,
      error: 'health_check_threw_unexpected_error',
    };
  }
}
