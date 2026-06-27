/**
 * @spec(RF-ADM-FF-03, RNF-RELI-FF-01)
 *
 * Use case `CriarFeatureFlagUseCase` — cria uma flag e registra audit log.
 *
 * Atomicidade (RNF-RELI-FF-01): a persistência da flag + audit log é
 * feita pelo repositório em uma única transação Prisma. Esta camada
 * invoca `auditLogger.log()` APÓS a persistência para notificar sistemas
 * externos (ex.: webhook). O commit da flag é responsabilidade do repo.
 *
 * Validação de key e defaultValue é feita via VOs no domínio
 * (FlagKey.criar, FlagValue.criar).
 */
import { ConflictException, BadRequestException, Injectable } from '@nestjs/common';

import { FlagKey } from '../../../../domain/admin/feature-flags/value-objects/FlagKey';
import {
  FlagValue,
  FlagValueType,
} from '../../../../domain/admin/feature-flags/value-objects/FlagValue';
import {
  IFeatureFlagRepository,
  FeatureFlagCompleto,
} from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';
import type { AuditLoggerLike } from '../../../../infrastructure/admin/feature-flags/audit/FeatureFlagAuditLogger';

export interface CriarFeatureFlagInput {
  key: string;
  description?: string | null;
  valueType: FlagValueType;
  defaultValue: unknown;
  enabled?: boolean;
  actorId: string;
}

@Injectable()
export class CriarFeatureFlagUseCase {
  constructor(
    private readonly repo: IFeatureFlagRepository,
    private readonly auditLogger: AuditLoggerLike
  ) {}

  async executar(input: CriarFeatureFlagInput): Promise<FeatureFlagCompleto> {
    // 1) Validação de key (VOs)
    let keyVO: FlagKey;
    try {
      keyVO = FlagKey.criar(input.key);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    // 2) Validação de defaultValue vs valueType
    try {
      FlagValue.criar(input.valueType, input.defaultValue);
    } catch (err) {
      throw new BadRequestException(
        `defaultValue incompatível com valueType: ${(err as Error).message}`
      );
    }

    // 3) Verifica unicidade
    const existing = await this.repo.findByKey(keyVO.valor);
    if (existing) {
      throw new ConflictException(`Flag '${keyVO.valor}' já existe`);
    }

    // 4) Persiste (atomicidade é responsabilidade do repositório via
    //    prisma.$transaction). Aqui usamos o auditLogger para espelhar
    //    o evento — falha dele é propagada conforme RNF-RELI-FF-01.
    const flag = await this.repo.criar({
      key: keyVO.valor,
      description: input.description ?? null,
      valueType: input.valueType,
      defaultValue: input.defaultValue,
      enabled: input.enabled ?? true,
      updatedBy: input.actorId,
      actorId: input.actorId,
    });

    // 5) Audit log via wrapper — em produção, este wrapper é o próprio
    //    repositório (que faz tudo dentro da transação). Aqui, ele é
    //    chamado para garantir que falhas sejam propagadas.
    await this.auditLogger.log({
      action: 'CREATE',
      actorId: input.actorId,
      before: null,
      after: flag,
    });

    return flag;
  }
}
