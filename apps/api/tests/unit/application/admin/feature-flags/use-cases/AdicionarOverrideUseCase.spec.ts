/**
 * @spec(RF-ADM-FF-05, RF-ADM-FF-06, RF-ADM-FF-07)
 *
 * Testes dos use cases de override:
 *  - AdicionarOverrideUseCase (RF-ADM-FF-05)
 *  - RemoverOverrideUseCase (RF-ADM-FF-06)
 *  - ListarOverridesUseCase (RF-ADM-FF-07)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { AdicionarOverrideUseCase } from '../../../../../../src/application/admin/feature-flags/use-cases/AdicionarOverrideUseCase';
// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { RemoverOverrideUseCase } from '../../../../../../src/application/admin/feature-flags/use-cases/RemoverOverrideUseCase';
// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { ListarOverridesUseCase } from '../../../../../../src/application/admin/feature-flags/use-cases/ListarOverridesUseCase';

function makeDeps() {
  return {
    repo: {
      findByKey: vi.fn(),
      adicionarOverride: vi.fn(),
      removerOverride: vi.fn(),
      listarOverrides: vi.fn(),
    },
    cache: { invalidate: vi.fn() },
    auditLogger: { log: vi.fn() },
  };
}

describe('AdicionarOverrideUseCase (RF-ADM-FF-05)', () => {
  let deps: ReturnType<typeof makeDeps>;
  let useCase: AdicionarOverrideUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = makeDeps();
    useCase = new AdicionarOverrideUseCase(deps.repo, deps.cache, deps.auditLogger);
  });

  it('adiciona override RESTAURANT válido e invalida cache', async () => {
    deps.repo.findByKey.mockResolvedValue({ key: 'pix_enabled', enabled: true });
    deps.repo.adicionarOverride.mockResolvedValue({
      id: 'ov_1',
      scope: 'RESTAURANT',
      scopeId: 'rest_aurora',
      value: true,
    });

    const result = await useCase.executar({
      flagKey: 'pix_enabled',
      scope: 'RESTAURANT',
      scopeId: 'rest_aurora',
      value: true,
      actorId: 'owner_1',
    });

    expect(result.id).toBe('ov_1');
    expect(deps.cache.invalidate).toHaveBeenCalledWith('pix_enabled');
    expect(deps.auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'OVERRIDE_ADD' })
    );
  });

  it('rejeita GLOBAL com scopeId preenchido', async () => {
    await expect(
      useCase.executar({
        flagKey: 'pix_enabled',
        scope: 'GLOBAL',
        scopeId: 'qualquer',
        value: true,
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/scopeId.*nulo.*GLOBAL/i);

    expect(deps.repo.adicionarOverride).not.toHaveBeenCalled();
  });

  it('rejeita RESTAURANT sem scopeId', async () => {
    await expect(
      useCase.executar({
        flagKey: 'pix_enabled',
        scope: 'RESTAURANT',
        value: true,
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/scopeId.*obrigatório/i);
  });

  it('rejeita expiresAt no passado', async () => {
    await expect(
      useCase.executar({
        flagKey: 'pix_enabled',
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        value: true,
        expiresAt: '2020-01-01T00:00:00.000Z',
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/futuro/i);
  });

  it('rejeita override duplicado (409)', async () => {
    deps.repo.findByKey.mockResolvedValue({ key: 'pix_enabled', enabled: true });
    deps.repo.adicionarOverride.mockRejectedValue(new Error('unique constraint'));

    await expect(
      useCase.executar({
        flagKey: 'pix_enabled',
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        value: true,
        actorId: 'owner_1',
      })
    ).rejects.toThrow();
  });

  it('rejeita adição em flag desabilitada (enabled=false)', async () => {
    deps.repo.findByKey.mockResolvedValue({ key: 'pix_enabled', enabled: false });

    await expect(
      useCase.executar({
        flagKey: 'pix_enabled',
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        value: true,
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/desabilitada|disabled/i);

    expect(deps.repo.adicionarOverride).not.toHaveBeenCalled();
  });
});

describe('RemoverOverrideUseCase (RF-ADM-FF-06)', () => {
  let deps: ReturnType<typeof makeDeps>;
  let useCase: RemoverOverrideUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = makeDeps();
    useCase = new RemoverOverrideUseCase(deps.repo, deps.cache, deps.auditLogger);
  });

  it('remove override e invalida cache', async () => {
    const before = { id: 'ov_1', scope: 'RESTAURANT', scopeId: 'rest_aurora' };
    deps.repo.removerOverride.mockResolvedValue(before);

    await useCase.executar({
      flagKey: 'pix_enabled',
      overrideId: 'ov_1',
      actorId: 'owner_1',
    });

    expect(deps.cache.invalidate).toHaveBeenCalledWith('pix_enabled');
    expect(deps.auditLogger.log).toHaveBeenCalledWith({
      action: 'OVERRIDE_REMOVE',
      actorId: 'owner_1',
      before,
      after: null,
    });
  });

  it('retorna NotFound quando override não existe', async () => {
    deps.repo.removerOverride.mockResolvedValue(null);

    await expect(
      useCase.executar({
        flagKey: 'pix_enabled',
        overrideId: 'ov_inexistente',
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/não encontrado|not found/i);

    expect(deps.cache.invalidate).not.toHaveBeenCalled();
  });
});

describe('ListarOverridesUseCase (RF-ADM-FF-07)', () => {
  let deps: ReturnType<typeof makeDeps>;
  let useCase: ListarOverridesUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = makeDeps();
    useCase = new ListarOverridesUseCase(deps.repo);
  });

  it('lista overrides ativos (exclui expirados) ordenados por scope asc', async () => {
    deps.repo.listarOverrides.mockResolvedValue([
      { id: 'a', scope: 'RESTAURANT', scopeId: 'rest_polaris' },
      { id: 'b', scope: 'GLOBAL', scopeId: null },
    ]);

    const result = await useCase.executar({
      flagKey: 'pix_enabled',
      limit: 50,
      offset: 0,
    });

    expect(result).toHaveLength(2);
    // Verifica que a query exclui expirados via `where: { expiresAt: { gt: now } OR null }`
    expect(deps.repo.listarOverrides).toHaveBeenCalledWith(
      expect.objectContaining({
        flagKey: 'pix_enabled',
        limit: 50,
        offset: 0,
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } },
          ]),
        }),
      })
    );
  });
});
