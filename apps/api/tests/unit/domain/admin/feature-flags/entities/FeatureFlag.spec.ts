/**
 * @spec(RF-ADM-FF-03, RF-ADM-FF-04, RF-ADM-FF-05, RF-ADM-FF-08)
 *
 * Testes do agregado `FeatureFlag` (apps/api/src/domain/admin/feature-flags/entities/FeatureFlag.ts).
 *
 * Invariantes verificadas:
 *  - `key` é imutável após criação (RF-ADM-FF-04).
 *  - `valueType` é imutável após criação (RF-ADM-FF-04).
 *  - `defaultValue` deve ser compatível com `valueType` no construtor.
 *  - `enabled = false` zera avaliações (RF-ADM-FF-08, §6.2).
 *  - `atualizar()` rejeita tentativa de alterar `key` ou `valueType`.
 *  - `desabilitar()` faz toggle e gera domain event `FeatureFlagChanged`.
 */
import { describe, it, expect } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { FeatureFlag } from '../../../../../../src/domain/admin/feature-flags/entities/FeatureFlag';
// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { FeatureFlagChanged } from '../../../../../../src/domain/admin/feature-flags/events/FeatureFlagChanged';

function criarFlagValida(
  overrides: Partial<{
    key: string;
    description: string;
    valueType: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
    defaultValue: unknown;
    enabled: boolean;
  }> = {}
) {
  return FeatureFlag.criar({
    key: overrides.key ?? 'pix_enabled',
    description: overrides.description ?? 'Habilita PIX',
    valueType: overrides.valueType ?? 'BOOLEAN',
    defaultValue: overrides.defaultValue ?? false,
    enabled: overrides.enabled ?? true,
    updatedBy: 'user_owner_1',
  });
}

describe('FeatureFlag (aggregate root)', () => {
  describe('criação', () => {
    it('cria flag booleana válida', () => {
      const flag = criarFlagValida();
      expect(flag.key).toBe('pix_enabled');
      expect(flag.valueType).toBe('BOOLEAN');
      expect(flag.defaultValue).toBe(false);
      expect(flag.enabled).toBe(true);
    });

    it('rejeita key que não casa com FlagKey (snake_case)', () => {
      expect(() => criarFlagValida({ key: 'INVALID-KEY' })).toThrow(/snake_case|inválid/i);
    });

    it('rejeita defaultValue incompatível com valueType', () => {
      expect(() =>
        criarFlagValida({ valueType: 'BOOLEAN', defaultValue: 'string-incompativel' })
      ).toThrow(/incompatível/i);
    });

    it('enabled default é true ao criar', () => {
      const flag = criarFlagValida({ enabled: undefined });
      expect(flag.enabled).toBe(true);
    });
  });

  describe('imutabilidade de key e valueType (RF-ADM-FF-04)', () => {
    it('atualizar() rejeita alteração de key', () => {
      const flag = criarFlagValida();
      expect(() => flag.atualizar({ key: 'outro_nome' } as never)).toThrow(/key.*imutável/i);
    });

    it('atualizar() rejeita alteração de valueType', () => {
      const flag = criarFlagValida();
      expect(() => flag.atualizar({ valueType: 'STRING' } as never)).toThrow(
        /valueType.*imutável/i
      );
    });

    it('atualizar() aceita mudança de description', () => {
      const flag = criarFlagValida();
      flag.atualizar({ description: 'Nova descrição' });
      expect(flag.description).toBe('Nova descrição');
    });

    it('atualizar() aceita mudança de defaultValue desde que compatível', () => {
      const flag = criarFlagValida();
      flag.atualizar({ defaultValue: true });
      expect(flag.defaultValue).toBe(true);
    });

    it('atualizar() aceita mudança de enabled', () => {
      const flag = criarFlagValida({ enabled: true });
      flag.atualizar({ enabled: false });
      expect(flag.enabled).toBe(false);
    });
  });

  describe('toggle off como curto-circuito (RF-ADM-FF-08)', () => {
    it('desabilitar() zera enabled e gera evento', () => {
      const flag = criarFlagValida({ enabled: true });
      const events = flag.desabilitar('user_owner_1');

      expect(flag.enabled).toBe(false);
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(FeatureFlagChanged);
      expect((events[0] as FeatureFlagChanged).after.enabled).toBe(false);
    });

    it('re-habilitar() emite evento com after.enabled = true', () => {
      const flag = criarFlagValida({ enabled: false });
      const events = flag.habilitar('user_owner_1');
      expect(flag.enabled).toBe(true);
      expect(events[0].after.enabled).toBe(true);
    });
  });

  describe('override lifecycle (RF-ADM-FF-05, RF-ADM-FF-06)', () => {
    it('adicionarOverride persiste override ativo', () => {
      const flag = criarFlagValida();
      const override = flag.adicionarOverride({
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        value: true,
      });
      expect(flag.overrideCount).toBe(1);
      expect(override.scope).toBe('RESTAURANT');
    });

    it('adicionarOverride rejeita duplicate (flagId, scope, scopeId)', () => {
      const flag = criarFlagValida();
      flag.adicionarOverride({ scope: 'RESTAURANT', scopeId: 'rest_aurora', value: true });
      expect(() =>
        flag.adicionarOverride({ scope: 'RESTAURANT', scopeId: 'rest_aurora', value: false })
      ).toThrow(/já existe|duplicate|unique/i);
    });

    it('removerOverride remove e retorna evento', () => {
      const flag = criarFlagValida();
      const override = flag.adicionarOverride({
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        value: true,
      });
      const events = flag.removerOverride(override.id);
      expect(flag.overrideCount).toBe(0);
      expect(events).toHaveLength(1);
      expect(events[0].before).toBeDefined();
    });

    it('removerOverride inexistente lança erro', () => {
      const flag = criarFlagValida();
      expect(() => flag.removerOverride('id-inexistente')).toThrow(/não encontrado/i);
    });

    it('listarOverridesAtivos exclui expirados', () => {
      const flag = criarFlagValida();
      flag.adicionarOverride({
        scope: 'RESTAURANT',
        scopeId: 'rest_aurora',
        value: true,
        expiresAt: new Date('2020-01-01'),
      });
      flag.adicionarOverride({
        scope: 'RESTAURANT',
        scopeId: 'rest_polaris',
        value: false,
      });
      const ativos = flag.listarOverridesAtivos(new Date('2026-06-26'));
      expect(ativos).toHaveLength(1);
      expect(ativos[0].scopeId).toBe('rest_polaris');
    });
  });
});
