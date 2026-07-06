/**
 * @spec(RF-ADM-FF-06, RNF-RELI-FF-01)
 *
 * Use case `RemoverOverrideUseCase` — remove override e registra audit log.
 */
import { Injectable, NotFoundException, Inject } from '@nestjs/common';

import {
  IFeatureFlagRepository,
  FeatureFlagOverrideData,
} from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';
import { FeatureFlagAuditLogger } from '../../../../infrastructure/admin/feature-flags/audit/FeatureFlagAuditLogger';
import { FeatureFlagCache } from '../../../../infrastructure/admin/feature-flags/cache/FeatureFlagCache';

export interface RemoverOverrideInput {
  flagKey: string;
  overrideId: string;
  actorId: string;
}

@Injectable()
export class RemoverOverrideUseCase {
  constructor(
    @Inject('IFeatureFlagRepository') private readonly repo: IFeatureFlagRepository,
    @Inject(FeatureFlagCache) private readonly cache: FeatureFlagCache,
    private readonly auditLogger: FeatureFlagAuditLogger
  ) {}

  async executar(input: RemoverOverrideInput): Promise<void> {
    const removed = await this.repo.removerOverride(input.overrideId);
    if (!removed) {
      throw new NotFoundException(`Override '${input.overrideId}' não encontrado`);
    }

    // Cache invalidation
    await this.cache.invalidate(input.flagKey);

    // Audit log
    await this.auditLogger.log({
      action: 'OVERRIDE_REMOVE',
      actorId: input.actorId,
      before: removed,
      after: null,
    });
  }
}
