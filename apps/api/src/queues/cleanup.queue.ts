import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { PrismaService } from '../common/prisma.service';

import { QueueService } from './queue.module';

/**
 * Auditoria ACHADO-7 (Re-varredura 5): cleanup de tokens/keys expirados.
 *
 * Sem cleanup regular, tabelas como `IdempotencyKey`, `PasswordResetToken`
 * (used=true), `RefreshToken` (revokedAt != null) e `WebhookEvent` crescem
 * indefinidamente. Isso vira:
 *  - Crescimento de DB sem bound → degrada índice `@@index([expiresAt])`.
 *  - Retenção de PII/tokens além do necessário (LGPD Art. 16 — eliminação
 *    após cessada a finalidade).
 *  - Índices UNIQUE do tipo `@@unique([scope, key])` crescem e queries
 *    `findFirst({ where: { scope, key } })` ficam mais lentas.
 *
 * Estratégia: BullMQ `repeat: { pattern: '0 3 * * *' }` — cron diário às 03:00
 * UTC. Em modo no-op (sem Redis), o serviço é no-op também — ambientes
 * dev/CI sem Redis não precisam de cleanup, e o `prisma db push` em CI zera
 * o estado periodicamente.
 */

export const CLEANUP_QUEUE_NAME = 'cleanup';

/**
 * Retenção em dias. Cada tabela pode ter seu próprio TTL:
 * - IdempotencyKey: 24h após `expiresAt` (após isso, dedupe é inútil).
 * - PasswordResetToken (used=true): 7 dias (janela para auditoria/debug).
 * - RefreshToken (revoked): 30 dias (suficiente para detectar reuso).
 * - WebhookEvent: 30 dias (idem — após isso, MP não reenvia).
 */
const TTL = {
  idempotencyGraceMs: 24 * 60 * 60 * 1000,
  passwordResetUsedGraceMs: 7 * 24 * 60 * 60 * 1000,
  refreshTokenRevokedGraceMs: 30 * 24 * 60 * 60 * 1000,
  webhookEventGraceMs: 30 * 24 * 60 * 60 * 1000,
} as const;

export interface CleanupResult {
  idempotencyKeysDeleted: number;
  passwordResetTokensDeleted: number;
  refreshTokensDeleted: number;
  webhookEventsDeleted: number;
  ranAt: string;
}

@Injectable()
export class CleanupQueue implements OnModuleInit {
  private readonly logger = new Logger(CleanupQueue.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService
  ) {}

  onModuleInit() {
    const queue = this.queueService.register<CleanupResult>(
      {
        name: CLEANUP_QUEUE_NAME,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: { count: 30 },
          removeOnFail: { count: 30 },
        },
      },
      async () => {
        const result = await this.runCleanup();
        this.logger.log(
          `[cleanup] idempotencyKeys=${result.idempotencyKeysDeleted}, ` +
            `passwordResetTokens=${result.passwordResetTokensDeleted}, ` +
            `refreshTokens=${result.refreshTokensDeleted}, ` +
            `webhookEvents=${result.webhookEventsDeleted}`
        );
      }
    );

    if (queue) {
      // Agenda a execução diária às 03:00 UTC (job idempotente — BullMQ
      // deduplica repeat jobs pelo `jobId` derivado do pattern).
      queue.add(
        CLEANUP_QUEUE_NAME,
        {},
        {
          repeat: { pattern: '0 3 * * *' },
          jobId: 'cleanup-daily',
        }
      );
      this.logger.log(`Cleanup diário agendado para 03:00 UTC`);
    }
  }

  /**
   * Executa o cleanup manualmente (útil para testes E2E ou admin script).
   * Retorna o resultado com contadores de linhas removidas.
   */
  async runCleanup(): Promise<CleanupResult> {
    const now = Date.now();
    const nowIso = new Date().toISOString();

    // 1. IdempotencyKey expiradas (após TTL de 24h além de expiresAt).
    // O `@@index([expiresAt])` torna este DELETE barato.
    const idempotencyKeysDeleted = await this.prisma.idempotencyKey
      .deleteMany({
        where: {
          expiresAt: { lt: new Date(now - TTL.idempotencyGraceMs) },
        },
      })
      .then((r) => r.count);

    // 2. PasswordResetToken usados há mais de 7 dias.
    // Mantém os `used: false` (ainda dentro do TTL de 1h — cobertos por
    // `expiresAt` na próxima varredura).
    const passwordResetTokensDeleted = await this.prisma.passwordResetToken
      .deleteMany({
        where: {
          used: true,
          createdAt: { lt: new Date(now - TTL.passwordResetUsedGraceMs) },
        },
      })
      .then((r) => r.count);

    // 3. RefreshToken revogados há mais de 30 dias.
    // Não remove os não-revogados (precisam estar vivos para rotacionar).
    const refreshTokensDeleted = await this.prisma.refreshToken
      .deleteMany({
        where: {
          revokedAt: { not: null, lt: new Date(now - TTL.refreshTokenRevokedGraceMs) },
        },
      })
      .then((r) => r.count);

    // 4. WebhookEvent processados há mais de 30 dias.
    // MP reenvia no máximo por algumas horas; 30 dias é mais que suficiente.
    const webhookEventsDeleted = await this.prisma.webhookEvent
      .deleteMany({
        where: {
          processedAt: { lt: new Date(now - TTL.webhookEventGraceMs) },
        },
      })
      .then((r) => r.count);

    return {
      idempotencyKeysDeleted,
      passwordResetTokensDeleted,
      refreshTokensDeleted,
      webhookEventsDeleted,
      ranAt: nowIso,
    };
  }

  /**
   * Permite execução on-demand (ex: endpoint admin ou script de migração).
   * Enfileira um job único; se Redis estiver desabilitado, executa inline.
   */
  async triggerManualCleanup(): Promise<void> {
    await this.queueService.enqueue<unknown>(CLEANUP_QUEUE_NAME, {});
  }
}
