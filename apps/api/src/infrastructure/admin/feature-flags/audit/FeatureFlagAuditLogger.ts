/**
 * @spec(RF-ADM-FF-09, RNF-RELI-FF-01)
 *
 * `FeatureFlagAuditLogger` — encapsula a escrita de audit log.
 *
 * Padrão de uso: o use case chama `auditLogger.log(...)` APÓS o repositório
 * ter persistido a mutation (atomicidade via `prisma.$transaction` no repositório).
 * Aqui expomos um wrapper para que use cases não importem o client Prisma
 * diretamente.
 */
import { FeatureFlagAction } from '../../../../domain/admin/feature-flags/events/FeatureFlagChanged';

export interface AuditLoggerLike {
  log(params: {
    action: FeatureFlagAction | string;
    actorId: string;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
  }): Promise<void>;
}

/**
 * Implementação concreta. Recebe um `auditWriter` por DI — em produção é
 * o repositório (que faz tudo dentro de uma transação); em testes é um mock.
 */
export class FeatureFlagAuditLogger implements AuditLoggerLike {
  constructor(
    private readonly writer: {
      audit: (params: {
        flagKey: string;
        action: string;
        actorId: string;
        before: unknown;
        after: unknown;
        reason?: string | null;
      }) => Promise<void>;
    }
  ) {}

  async log(params: {
    action: FeatureFlagAction | string;
    actorId: string;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
  }): Promise<void> {
    if (!params.actorId) {
      throw new Error('FeatureFlagAuditLogger: actorId obrigatório para audit log');
    }
    // O writer é injetado pelo repositório concreto — em produção é uma
    // chamada interna ao `prisma.featureFlagAuditLog.create` dentro da
    // transação da mutation.
    await this.writer.audit({
      flagKey: '', // preenchido pelo writer concreto
      action: params.action,
      actorId: params.actorId,
      before: params.before ?? null,
      after: params.after ?? null,
      reason: params.reason ?? null,
    });
  }
}
