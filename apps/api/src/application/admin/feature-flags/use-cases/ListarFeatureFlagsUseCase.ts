/**
 * @spec(RF-ADM-FF-01)
 *
 * Use case `ListarFeatureFlagsUseCase` — lista flags paginadas com
 * contagem de overrides ativos.
 */
import { Injectable, Inject } from '@nestjs/common';

import {
  IFeatureFlagRepository,
  FeatureFlagResumo,
} from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';

export interface ListarFeatureFlagsInput {
  limit: number;
  offset: number;
}

export interface ListarFeatureFlagsResult {
  data: FeatureFlagResumo[];
  total: number;
}

@Injectable()
export class ListarFeatureFlagsUseCase {
  constructor(@Inject('IFeatureFlagRepository') private readonly repo: IFeatureFlagRepository) {}

  async executar(input: ListarFeatureFlagsInput): Promise<ListarFeatureFlagsResult> {
    return this.repo.listar({ limit: input.limit, offset: input.offset });
  }
}
