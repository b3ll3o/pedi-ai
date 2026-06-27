/**
 * @spec(RF-ADM-FF-03, RNF-RELI-FF-01)
 *
 * Testes do use case `CriarFeatureFlagUseCase`.
 * Atomicidade: persistência + audit log no mesmo Prisma.$transaction.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { CriarFeatureFlagUseCase } from '../../../../../../src/application/admin/feature-flags/use-cases/CriarFeatureFlagUseCase';

describe('CriarFeatureFlagUseCase (RF-ADM-FF-03)', () => {
  let repo: { criar: ReturnType<typeof vi.fn>; findByKey: ReturnType<typeof vi.fn> };
  let auditLogger: { log: ReturnType<typeof vi.fn> };
  let useCase: CriarFeatureFlagUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = {
      criar: vi.fn(),
      findByKey: vi.fn().mockResolvedValue(null),
    };
    auditLogger = {
      log: vi.fn().mockResolvedValue(undefined),
    };
    useCase = new CriarFeatureFlagUseCase(repo, auditLogger);
  });

  it('persiste flag válida e registra audit log CREATE', async () => {
    const flagCriada = {
      id: 'flag_1',
      key: 'pix_enabled',
      valueType: 'BOOLEAN',
      defaultValue: false,
      enabled: true,
    };
    repo.criar.mockResolvedValue(flagCriada);

    const result = await useCase.executar({
      key: 'pix_enabled',
      description: 'Habilita PIX',
      valueType: 'BOOLEAN',
      defaultValue: false,
      actorId: 'owner_1',
    });

    expect(result.key).toBe('pix_enabled');
    expect(result.enabled).toBe(true);
    expect(auditLogger.log).toHaveBeenCalledWith({
      action: 'CREATE',
      actorId: 'owner_1',
      before: null,
      after: flagCriada,
    });
  });

  it('rejeita key duplicada retornando ConflictException', async () => {
    repo.findByKey.mockResolvedValue({ key: 'pix_enabled' });

    await expect(
      useCase.executar({
        key: 'pix_enabled',
        valueType: 'BOOLEAN',
        defaultValue: false,
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/já existe|conflict|409/i);

    expect(repo.criar).not.toHaveBeenCalled();
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  it('rejeita key inválida (snake_case)', async () => {
    await expect(
      useCase.executar({
        key: 'Invalid-Key',
        valueType: 'BOOLEAN',
        defaultValue: false,
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/snake_case|inválid/i);

    expect(repo.criar).not.toHaveBeenCalled();
  });

  it('rejeita defaultValue incompatível com valueType', async () => {
    await expect(
      useCase.executar({
        key: 'flag_x',
        valueType: 'BOOLEAN',
        defaultValue: 'string',
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/incompatível/i);
  });

  it('RNF-RELI-FF-01: se audit log falhar, flag NÃO deve persistir', async () => {
    repo.criar.mockResolvedValue({ id: 'flag_1', key: 'flag_x' });
    auditLogger.log.mockRejectedValue(new Error('audit table down'));

    await expect(
      useCase.executar({
        key: 'flag_x',
        valueType: 'BOOLEAN',
        defaultValue: false,
        actorId: 'owner_1',
      })
    ).rejects.toThrow(/audit/i);
  });
});
