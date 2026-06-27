/**
 * @spec(RF-ADM-FF-01..09)
 *
 * Testes do controller REST `FeatureFlagsController`.
 * Foco em request/response shapes, validação de DTO via Zod, status codes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { FeatureFlagsController } from '../../../../../../src/presentation/admin/feature-flags/controllers/FeatureFlagsController';

function makeUseCases() {
  return {
    listar: { executar: vi.fn() },
    obter: { executar: vi.fn() },
    criar: { executar: vi.fn() },
    atualizar: { executar: vi.fn() },
    adicionarOverride: { executar: vi.fn() },
    removerOverride: { executar: vi.fn() },
    listarOverrides: { executar: vi.fn() },
    listarAudit: { executar: vi.fn() },
    avaliar: { executar: vi.fn() },
  };
}

describe('FeatureFlagsController', () => {
  let controller: FeatureFlagsController;
  let uc: ReturnType<typeof makeUseCases>;

  beforeEach(() => {
    vi.clearAllMocks();
    uc = makeUseCases();
    controller = new FeatureFlagsController(uc as never);
  });

  describe('GET / — listar (RF-ADM-FF-01)', () => {
    it('retorna 200 com shape { data, total }', async () => {
      uc.listar.executar.mockResolvedValue({
        data: [{ key: 'pix_enabled' }],
        total: 1,
      });

      const result = await controller.listar(
        { user: { role: 'owner', sub: 'u1', restauranteId: 'r1' } } as never,
        { limit: 50, offset: 0 }
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('POST / — criar (RF-ADM-FF-03)', () => {
    it('retorna 201 com flag criada', async () => {
      uc.criar.executar.mockResolvedValue({ id: 'f1', key: 'pix_enabled' });

      const result = await controller.criar({ user: { role: 'owner', sub: 'u1' } } as never, {
        key: 'pix_enabled',
        valueType: 'BOOLEAN',
        defaultValue: false,
      });

      expect(result.id).toBe('f1');
    });

    it('rejeita key fora do regex snake_case com 400', async () => {
      await expect(
        controller.criar(
          { user: { role: 'owner', sub: 'u1' } } as never,
          // @ts-expect-error — testando validação Zod
          { key: 'InvalidKey', valueType: 'BOOLEAN', defaultValue: false }
        )
      ).rejects.toThrow(/snake_case|inválid/i);
    });

    it('rejeita defaultValue incompatível com valueType com 400', async () => {
      await expect(
        controller.criar(
          { user: { role: 'owner', sub: 'u1' } } as never,
          // @ts-expect-error — testando validação Zod
          { key: 'flag_x', valueType: 'BOOLEAN', defaultValue: 'string' }
        )
      ).rejects.toThrow(/incompatível/i);
    });
  });

  describe('PATCH /:key — atualizar (RF-ADM-FF-04)', () => {
    it('retorna 200 com flag atualizada', async () => {
      uc.atualizar.executar.mockResolvedValue({
        id: 'f1',
        key: 'cashback_enabled',
        enabled: false,
      });

      const result = await controller.atualizar(
        { user: { role: 'owner', sub: 'u1' } } as never,
        { key: 'cashback_enabled' },
        { enabled: false }
      );

      expect(result.enabled).toBe(false);
    });
  });

  describe('POST /:key/overrides (RF-ADM-FF-05)', () => {
    it('retorna 201 com override criado', async () => {
      uc.adicionarOverride.executar.mockResolvedValue({
        id: 'ov_1',
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
      });

      const result = await controller.adicionarOverride(
        { user: { role: 'owner', sub: 'u1' } } as never,
        { key: 'pix_enabled' },
        { scope: 'RESTAURANT', scopeId: 'rest_aurora', value: true }
      );

      expect(result.id).toBe('ov_1');
    });
  });

  describe('GET /evaluate (RF-ADM-FF-08)', () => {
    it('retorna mapa de valores resolvidos', async () => {
      uc.avaliar.executar.mockResolvedValue({ pix_enabled: true, combos_enabled: false });

      const result = await controller.avaliar({
        keys: 'pix_enabled,combos_enabled',
        restaurantId: 'rest_aurora',
      } as never);

      expect(result.pix_enabled).toBe(true);
      expect(result.combos_enabled).toBe(false);
    });

    it('rejeita mais de 32 chaves com 400', async () => {
      const keys = Array.from({ length: 33 }, (_, i) => `f_${i}`).join(',');
      await expect(controller.avaliar({ keys, restaurantId: 'r1' } as never)).rejects.toThrow(
        /máximo 32/i
      );
    });
  });
});
