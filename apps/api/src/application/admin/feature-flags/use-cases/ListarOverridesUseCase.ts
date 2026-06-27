/**
 * @spec(RF-ADM-FF-07)
 *
 * Use case `ListarOverridesUseCase` — lista overrides ativos (não-expirados)
 * de uma flag, ordenados por scope asc.
 */
import { Injectable } from '@nestjs/common';

import {
  IFeatureFlagRepository,
  FeatureFlagOverrideData,
} from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';

export interface ListarOverridesInput {
  flagKey: string;
  limit: number;
  offset: number;
  now?: Date;
}

@Injectable()
export class ListarOverridesUseCase {
  constructor(private readonly repo: IFeatureFlagRepository) {}

  async executar(input: ListarOverridesInput): Promise<FeatureFlagOverrideData[]> {
    const now = input.now ?? new Date();
    return this.repo.listarOverrides({
      flagKey: input.flagKey,
      limit: input.limit,
      offset: input.offset,
      now,
      where: {
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }
}
