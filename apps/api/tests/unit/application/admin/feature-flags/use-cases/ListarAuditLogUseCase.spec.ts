/**
 * @spec(RF-ADM-FF-09)
 *
 * Testes do use case `ListarAuditLogUseCase` e `AvaliarFeatureFlagUseCase`.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { ListarAuditLogUseCase } from '../../../../../../src/application/admin/feature-flags/use-cases/ListarAuditLogUseCase';
// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { AvaliarFeatureFlagUseCase } from '../../../../../../src/application/admin/feature-flags/use-cases/AvaliarFeatureFlagUseCase';

describe('ListarAuditLogUseCase (RF-ADM-FF-09)', () => {
  let repo: { listarAuditoria: ReturnType<typeof vi.fn> };
  let useCase: ListarAuditLogUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = { listarAuditoria: vi.fn().mockResolvedValue([]) };
    useCase = new ListarAuditLogUseCase(repo);
  });

  it('lista audit log ordenado por createdAt DESC com paginação', async () => {
    repo.listarAuditoria.mockResolvedValue([
      { id: 'a3', action: 'UPDATE', createdAt: new Date('2026-06-26T12:00:00Z') },
      { id: 'a2', action: 'OVERRIDE_ADD', createdAt: new Date('2026-06-26T11:00:00Z') },
      { id: 'a1', action: 'CREATE', createdAt: new Date('2026-06-26T10:00:00Z') },
    ]);

    const result = await useCase.executar({
      flagKey: 'pix_enabled',
      limit: 50,
      offset: 0,
    });

    expect(result).toHaveLength(3);
    expect(repo.listarAuditoria).toHaveBeenCalledWith({
      flagKey: 'pix_enabled',
      orderBy: { createdAt: 'desc' },
      limit: 50,
      offset: 0,
    });
  });

  it('retorna array vazio quando flag não tem histórico', async () => {
    repo.listarAuditoria.mockResolvedValue([]);
    const result = await useCase.executar({
      flagKey: 'flag_nova',
      limit: 50,
      offset: 0,
    });
    expect(result).toEqual([]);
  });
});

describe('AvaliarFeatureFlagUseCase (RF-ADM-FF-08)', () => {
  let evaluator: { evaluate: ReturnType<typeof vi.fn> };
  let metrics: { incrementEvaluation: ReturnType<typeof vi.fn> };
  let useCase: AvaliarFeatureFlagUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    evaluator = { evaluate: vi.fn().mockResolvedValue(true) };
    metrics = { incrementEvaluation: vi.fn() };
    useCase = new AvaliarFeatureFlagUseCase(evaluator, metrics);
  });

  it('avalia múltiplas chaves em batch e retorna mapa', async () => {
    evaluator.evaluate = vi.fn().mockImplementation(async (key: string) => {
      if (key === 'pix_enabled') return true;
      if (key === 'combos_enabled') return false;
      return undefined;
    });

    const result = await useCase.executar({
      keys: ['pix_enabled', 'combos_enabled', 'flag_inexistente'],
      ctx: { restaurantId: 'rest_aurora', userId: 'user_42' },
    });

    expect(result).toEqual({
      pix_enabled: true,
      combos_enabled: false,
      flag_inexistente: undefined,
    });
    expect(metrics.incrementEvaluation).toHaveBeenCalledTimes(3);
  });

  it('rejeita batch com mais de 32 chaves', async () => {
    const keys = Array.from({ length: 33 }, (_, i) => `flag_${i}`);
    await expect(useCase.executar({ keys, ctx: {} })).rejects.toThrow(/máximo 32|32 itens/i);

    expect(evaluator.evaluate).not.toHaveBeenCalled();
  });

  it('incrementa métrica Prometheus com labels key, scope, hit', async () => {
    evaluator.evaluate.mockResolvedValue(true);
    await useCase.executar({
      keys: ['pix_enabled'],
      ctx: { restaurantId: 'rest_aurora' },
    });

    expect(metrics.incrementEvaluation).toHaveBeenCalledWith({
      key: 'pix_enabled',
      scope: 'RESTAURANT',
      hit: true,
    });
  });
});
