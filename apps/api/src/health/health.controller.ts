import { Controller, Get, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../common/prisma.service';
import { QueueService } from '../queues/queue.module';

interface HealthComponent {
  name: string;
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  uptime: number;
  timestamp: string;
  components: HealthComponent[];
}

/**
 * Health check público (sem autenticação) com SkipThrottle — usado por
 * monitoramento externo (k8s, load balancer). Não revelar informações
 * sensíveis (versões, métricas internas) na resposta.
 *
 * Auditoria M10:
 * - `GET /` → **liveness**: confirma que o processo está vivo.
 *   Retorna 200 sempre (caso o processo responda). k8s usa para decidir
 *   se reinicia o pod.
 * - `GET /ready` → **readiness**: verifica dependências externas (DB,
 *   Redis) antes de marcar como pronto. k8s usa para decidir se envia
 *   tráfego. Retorna 503 se qualquer dependência crítica cair.
 */
@ApiTags('health')
@Controller()
export class HealthController {
  private readonly startupTime = Date.now();
  // Auditoria ACHADO-32 (Re-varredura 6): logger dedicado para mensagens
  // sanitizadas em produção (mensagens originais do Prisma/ioredis são
  // suprimidas da resposta HTTP mas logadas aqui).
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService
  ) {}

  @Get()
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Liveness probe — confirma que o processo está vivo' })
  @ApiResponse({ status: 200, description: 'API viva' })
  liveness(): { status: 'ok'; uptime: number } {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startupTime) / 1000),
    };
  }

  @Get('ready')
  @Public()
  @SkipThrottle()
  @ApiOperation({
    summary: 'Readiness probe — verifica dependências (DB, Redis)',
    description:
      'Retorna 503 se qualquer dependência crítica (Postgres, Redis) estiver fora. ' +
      'Usado por load balancer / k8s readiness probe.',
  })
  @ApiResponse({ status: 200, description: 'Dependências saudáveis' })
  @ApiResponse({ status: 503, description: 'Uma ou mais dependências indisponíveis' })
  async readiness(): Promise<HealthResponse> {
    const components: HealthComponent[] = [];

    // ── Postgres ────────────────────────────────────────────────
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      components.push({
        name: 'postgres',
        status: 'up',
        latencyMs: Date.now() - dbStart,
      });
    } catch (err) {
      // Auditoria ACHADO-32 (Re-varredura 6): mensagens de erro do Prisma
      // frequentemente expõem hostname/IP do banco (ex: `Can't reach
      // database server at 'rds-prod.cluster-xyz.us-east-1.rds.amazonaws.com'`).
      // Em produção, retornamos uma mensagem genérica para evitar reconnaissance
      // de topologia interna. O detalhe completo fica em log server-side
      // (com requestId para correlação operacional).
      const rawError = (err as Error).message;
      const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
      components.push({
        name: 'postgres',
        status: 'down',
        error: isProd ? 'connection_failed' : rawError,
      });
      if (isProd) {
        this.logger.error(
          `[health/ready] postgres indisponível (mensagem original suprimida): ${rawError}`
        );
      }
    }

    // ── Redis (BullMQ) — opcional, degrada com no-op se indisponível ─
    // Auditoria A11: usa singleton via QueueService em vez de criar
    // nova conexão por probe (vazamento + custo).
    //
    // Auditoria ACHADO-32: mesma sanitização — mensagens brutas do ioredis
    // podem vazar URL do Redis (senha embutida em erros de AUTH).
    const redisCheck = await this.queueService.pingRedis();
    if (redisCheck) {
      const component: HealthComponent = {
        name: 'redis',
        status: redisCheck.status,
        latencyMs: redisCheck.latencyMs,
      };
      if (redisCheck.error) {
        const isProd = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
        component.error = isProd ? 'connection_failed' : redisCheck.error;
        if (isProd) {
          this.logger.error(
            `[health/ready] redis indisponível (mensagem original suprimida): ${redisCheck.error}`
          );
        }
      }
      components.push(component);
    } else {
      // Redis não configurado — não é bloqueante (modo no-op).
      components.push({ name: 'redis', status: 'up' });
    }

    const allUp = components.every((c) => c.status === 'up');
    const response: HealthResponse = {
      status: allUp ? 'ok' : 'down',
      uptime: Math.floor((Date.now() - this.startupTime) / 1000),
      timestamp: new Date().toISOString(),
      components,
    };

    if (!allUp) {
      throw new ServiceUnavailableException(response);
    }
    return response;
  }
}
