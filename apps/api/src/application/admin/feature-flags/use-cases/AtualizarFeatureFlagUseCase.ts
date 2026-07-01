/**
 * @spec(RF-ADM-FF-04, RNF-RELI-FF-01)
 *
 * Use case `AtualizarFeatureFlagUseCase` — atualiza `description`,
 * `defaultValue` ou `enabled`. Rejeita alterações de `key` ou `valueType`
 * (imutáveis após criação, vide RF-ADM-FF-04).
 *
 * Cache invalidado em qualquer mutation bem-sucedida.
 */
import { BadRequestException, Injectable, NotFoundException, Inject } from '@nestjs/common';

import { FlagValue } from '../../../../domain/admin/feature-flags/value-objects/FlagValue';
import {
  IFeatureFlagRepository,
  FeatureFlagCompleto,
} from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';
import type { AuditLoggerLike } from '../../../../infrastructure/admin/feature-flags/audit/FeatureFlagAuditLogger';

export interface AtualizarFeatureFlagInput {
  key: string;
  patch: {
    description?: string | null;
    defaultValue?: unknown;
    enabled?: boolean;
  };
  actorId: string;
}

@Injectable()
export class AtualizarFeatureFlagUseCase {
  constructor(
    @Inject('IFeatureFlagRepository') private readonly repo: IFeatureFlagRepository,
    private readonly cache: { invalidate: (key: string) => Promise<void> | void },
    private readonly auditLogger: AuditLoggerLike
  ) {}

  async executar(input: AtualizarFeatureFlagInput): Promise<FeatureFlagCompleto> {
    // 1) Rejeitar tentativas de alterar campos imutáveis
    const rawPatch = input.patch as Record<string, unknown>;
    if ('key' in rawPatch && rawPatch.key !== undefined) {
      throw new BadRequestException('key é imutável após criação');
    }
    if ('valueType' in rawPatch && rawPatch.valueType !== undefined) {
      throw new BadRequestException('valueType é imutável após criação');
    }

    // 2) Validação de defaultValue se presente
    if (input.patch.defaultValue !== undefined) {
      const current = await this.repo.findByKey(input.key);
      if (!current) {
        throw new NotFoundException(`Flag '${input.key}' não encontrada`);
      }
      try {
        FlagValue.criar(current.valueType, input.patch.defaultValue);
      } catch (err) {
        throw new BadRequestException(
          `defaultValue incompatível com valueType: ${(err as Error).message}`
        );
      }
    }

    // 3) Buscar estado anterior para o audit
    const before = await this.repo.findByKey(input.key);
    if (!before) {
      throw new NotFoundException(`Flag '${input.key}' não encontrada`);
    }

    // 4) Persistir (atomicidade via $transaction)
    const after = await this.repo.atualizar({
      key: input.key,
      patch: input.patch,
      actorId: input.actorId,
    });

    // 5) Invalidar cache
    await this.cache.invalidate(input.key);

    // 6) Audit log
    await this.auditLogger.log({
      action: 'UPDATE',
      actorId: input.actorId,
      before,
      after,
    });

    return after;
  }
}
