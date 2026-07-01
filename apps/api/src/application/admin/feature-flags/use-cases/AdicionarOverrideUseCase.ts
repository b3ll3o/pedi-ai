/**
 * @spec(RF-ADM-FF-05, RNF-RELI-FF-01)
 *
 * Use case `AdicionarOverrideUseCase` — adiciona override a uma flag.
 *
 * Validações:
 *   - flag deve existir e estar `enabled = true`
 *   - scope = GLOBAL ⇒ scopeId nulo (case contrário, erro)
 *   - scope = RESTAURANT | USER ⇒ scopeId obrigatório
 *   - expiresAt deve estar no futuro
 *
 * Falha do repositório (ex.: constraint unique) é propagada.
 */
import { BadRequestException, Injectable, Inject } from '@nestjs/common';

import { TargetingRule } from '../../../../domain/admin/feature-flags/value-objects/TargetingRule';
import {
  IFeatureFlagRepository,
  FeatureFlagOverrideData,
} from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';
import type { AuditLoggerLike } from '../../../../infrastructure/admin/feature-flags/audit/FeatureFlagAuditLogger';

export interface AdicionarOverrideInput {
  flagKey: string;
  scope: 'GLOBAL' | 'RESTAURANT' | 'USER';
  scopeId?: string | null;
  value: unknown;
  rolloutPct?: number | null;
  expiresAt?: string | null;
  actorId: string;
}

@Injectable()
export class AdicionarOverrideUseCase {
  constructor(
    @Inject('IFeatureFlagRepository') private readonly repo: IFeatureFlagRepository,
    private readonly cache: { invalidate: (key: string) => Promise<void> | void },
    private readonly auditLogger: AuditLoggerLike
  ) {}

  async executar(input: AdicionarOverrideInput): Promise<FeatureFlagOverrideData> {
    // 1) TargetingRule valida scope/scopeId (antes de qualquer I/O)
    try {
      TargetingRule.criar({ scope: input.scope, scopeId: input.scopeId ?? null });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    // 2) expiresAt no futuro
    if (input.expiresAt) {
      const date = new Date(input.expiresAt);
      if (date.getTime() <= Date.now()) {
        throw new BadRequestException('expiresAt deve ser uma data no futuro');
      }
    }

    // 3) Flag deve existir e estar habilitada
    const flag = await this.repo.findByKey(input.flagKey);
    if (!flag) {
      throw new BadRequestException(`Flag '${input.flagKey}' não encontrada`);
    }
    if (!flag.enabled) {
      throw new BadRequestException(`Flag '${input.flagKey}' está desabilitada`);
    }

    // 4) Persiste override (transação atômica com audit)
    const override = await this.repo.adicionarOverride({
      flagKey: input.flagKey,
      scope: input.scope,
      scopeId: input.scopeId ?? null,
      value: input.value,
      rolloutPct: input.rolloutPct ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdBy: input.actorId,
      actorId: input.actorId,
    });

    // 5) Cache invalidation
    await this.cache.invalidate(input.flagKey);

    // 6) Audit log
    await this.auditLogger.log({
      action: 'OVERRIDE_ADD',
      actorId: input.actorId,
      before: null,
      after: override,
    });

    return override;
  }
}
