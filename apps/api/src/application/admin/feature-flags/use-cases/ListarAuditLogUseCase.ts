/**
 * @spec(RF-ADM-FF-09)
 *
 * Use case `ListarAuditLogUseCase` — lista o audit log de uma flag, ordenado
 * por `createdAt DESC` com paginação.
 */
import { Injectable, Inject } from '@nestjs/common';

import {
  IFeatureFlagRepository,
  FeatureFlagAuditEntry,
} from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';

export interface ListarAuditLogInput {
  flagKey: string;
  limit: number;
  offset: number;
}

@Injectable()
export class ListarAuditLogUseCase {
  constructor(@Inject('IFeatureFlagRepository') private readonly repo: IFeatureFlagRepository) {}

  async executar(input: ListarAuditLogInput): Promise<FeatureFlagAuditEntry[]> {
    return this.repo.listarAuditoria({
      flagKey: input.flagKey,
      limit: input.limit,
      offset: input.offset,
      orderBy: { createdAt: 'desc' },
    });
  }
}
