/**
 * @spec(RF-ADM-FF-04, RNF-RELI-FF-01)
 *
 * Testes do use case `AtualizarFeatureFlagUseCase`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { AtualizarFeatureFlagUseCase } from '../../../../../../src/application/admin/feature-flags/use-cases/AtualizarFeatureFlagUseCase';

describe('AtualizarFeatureFlagUseCase (RF-ADM-FF-04)', () => {
  let repo: { findByKey: ReturnType<typeof vi.fn>; atualizar: ReturnType<typeof vi.fn> };
  let cache: { invalidate: ReturnType<typeof vi.fn> };
  let auditLogger: { log: ReturnType<typeof vi.fn> };
  let useCase: AtualizarFeatureFlagUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = {
      findByKey: vi.fn(),
      atualizar: vi.fn(),
    };
    cache = { invalidate: vi.fn() };
    auditLogger = { log: vi.fn() };
    useCase = new AtualizarFeatureFlagUseCase(repo, cache, auditLogger);
  });

  it('atualiza enabled=false e invalida cache', async () => {
    const before = { id: 'f1', key: 'cashback_enabled', enabled: true, defaultValue: false };
    const after = { id: 'f1', key: 'cashback_enabled', enabled: false, defaultValue: false };
    repo.findByKey.mockResolvedValue(before);
    repo.atualizar.mockResolvedValue(after);

    await useCase.executar({
      key: 'cashback_enabled',
      patch: { enabled: false },
      actorId: 'owner_1',
    });

    expect(cache.invalidate).toHaveBeenCalledWith('cashback_enabled');
    expect(auditLogger.log).toHaveBeenCalledWith({
      action: 'UPDATE',
      actorId: 'owner_1',
      before,
      after,
    });
  });

  it('rejeita patch com key', async () => {
    await expect(
      useCase.executar({
        key: 'pix_enabled',
        patch: { key: 'outro_nome' } as never,
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/key.*imutável/i);

    expect(repo.atualizar).not.toHaveBeenCalled();
    expect(cache.invalidate).not.toHaveBeenCalled();
  });

  it('rejeita patch com valueType', async () => {
    await expect(
      useCase.executar({
        key: 'pix_enabled',
        patch: { valueType: 'STRING' } as never,
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/valueType.*imutável/i);
  });

  it('retorna NotFound quando flag não existe', async () => {
    repo.findByKey.mockResolvedValue(null);

    await expect(
      useCase.executar({
        key: 'flag_inexistente',
        patch: { enabled: false },
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/não encontrada|not found|404/i);
  });
});
