/**
 * @spec(RF-ADM-FF-02)
 *
 * Testes do use case `ObterFeatureFlagUseCase`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ObterFeatureFlagUseCase } from '../../../../../../src/application/admin/feature-flags/use-cases/ObterFeatureFlagUseCase';
import type { FeatureFlagCompleto } from '../../../../../../src/domain/admin/feature-flags/repositories/IFeatureFlagRepository';

describe('ObterFeatureFlagUseCase (RF-ADM-FF-02)', () => {
  let repo: { findByKey: ReturnType<typeof vi.fn> };
  let useCase: ObterFeatureFlagUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = { findByKey: vi.fn() };
    useCase = new ObterFeatureFlagUseCase(repo as never);
  });

  it('retorna a flag completa, incluindo overrides', async () => {
    const flag: FeatureFlagCompleto = {
      id: 'flag_1',
      key: 'pix_enabled',
      description: 'Habilita PIX',
      valueType: 'BOOLEAN',
      defaultValue: false,
      enabled: true,
      createdAt: new Date('2026-08-01T00:00:00.000Z'),
      updatedAt: new Date('2026-08-02T00:00:00.000Z'),
      updatedBy: 'owner_1',
      overrides: [],
    };
    repo.findByKey.mockResolvedValue(flag);

    await expect(useCase.executar('pix_enabled')).resolves.toBe(flag);
    expect(repo.findByKey).toHaveBeenCalledOnce();
    expect(repo.findByKey).toHaveBeenCalledWith('pix_enabled');
  });

  it('lança NotFoundException quando a chave não existe', async () => {
    repo.findByKey.mockResolvedValue(null);

    await expect(useCase.executar('flag_inexistente')).rejects.toBeInstanceOf(NotFoundException);
    await expect(useCase.executar('flag_inexistente')).rejects.toThrow(
      "Flag 'flag_inexistente' não encontrada",
    );
  });

  it('propaga falhas do repositório sem mascarar o erro', async () => {
    const erro = new Error('banco indisponível');
    repo.findByKey.mockRejectedValue(erro);

    await expect(useCase.executar('pix_enabled')).rejects.toBe(erro);
  });
});
