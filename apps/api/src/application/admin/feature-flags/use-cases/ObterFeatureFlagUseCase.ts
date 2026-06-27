/**
 * @spec(RF-ADM-FF-02)
 *
 * Use case `ObterFeatureFlagUseCase` — obtém uma flag por chave, incluindo
 * seus overrides. Lança `NotFoundException` se não existir.
 */
import { Injectable, NotFoundException } from '@nestjs/common';

import {
  IFeatureFlagRepository,
  FeatureFlagCompleto,
} from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';

@Injectable()
export class ObterFeatureFlagUseCase {
  constructor(private readonly repo: IFeatureFlagRepository) {}

  async executar(key: string): Promise<FeatureFlagCompleto> {
    const flag = await this.repo.findByKey(key);
    if (!flag) {
      throw new NotFoundException(`Flag '${key}' não encontrada`);
    }
    return flag;
  }
}
