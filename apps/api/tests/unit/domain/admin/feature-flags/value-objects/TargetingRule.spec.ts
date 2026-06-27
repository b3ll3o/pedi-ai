/**
 * @spec(RF-ADM-FF-05, RF-ADM-FF-08)
 *
 * Testes do Value Object `TargetingRule` (combinação de `scope` + `scopeId`).
 * Regras (design.md §5):
 *  - scope = GLOBAL  ⇒ scopeId deve ser null
 *  - scope = RESTAURANT | USER ⇒ scopeId obrigatório
 */
import { describe, it, expect } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { TargetingRule } from '../../../../../../src/domain/admin/feature-flags/value-objects/TargetingRule';

describe('TargetingRule (value object)', () => {
  describe('regras de construção', () => {
    it('GLOBAL aceita scopeId === null', () => {
      const rule = TargetingRule.criar({ scope: 'GLOBAL', scopeId: null });
      expect(rule.scope).toBe('GLOBAL');
      expect(rule.scopeId).toBeNull();
    });

    it('RESTAURANT exige scopeId não-vazio', () => {
      const rule = TargetingRule.criar({ scope: 'RESTAURANT', scopeId: 'rest_aurora' });
      expect(rule.scopeId).toBe('rest_aurora');
    });

    it('USER aceita scopeId simples (userId puro) ou composto (restaurantId:userId)', () => {
      const a = TargetingRule.criar({ scope: 'USER', scopeId: 'user_42' });
      const b = TargetingRule.criar({ scope: 'USER', scopeId: 'rest_aurora:user_42' });
      expect(a.scopeId).toBe('user_42');
      expect(b.scopeId).toBe('rest_aurora:user_42');
    });
  });

  describe('validações fail-closed', () => {
    it('GLOBAL com scopeId preenchido deve lançar erro', () => {
      expect(() => TargetingRule.criar({ scope: 'GLOBAL', scopeId: 'qualquer_coisa' })).toThrow(
        /scopeId deve ser nulo|GLOBAL/i
      );
    });

    it('RESTAURANT sem scopeId deve lançar erro', () => {
      expect(() => TargetingRule.criar({ scope: 'RESTAURANT', scopeId: null })).toThrow(
        /scopeId.*obrigatório/i
      );
    });

    it('RESTAURANT com scopeId string vazia deve lançar erro', () => {
      expect(() => TargetingRule.criar({ scope: 'RESTAURANT', scopeId: '' })).toThrow(
        /scopeId.*obrigatório/i
      );
    });

    it('USER sem scopeId deve lançar erro', () => {
      expect(() => TargetingRule.criar({ scope: 'USER', scopeId: null })).toThrow(
        /scopeId.*obrigatório/i
      );
    });

    it('scope fora do enum {GLOBAL,RESTAURANT,USER} deve lançar erro', () => {
      // @ts-expect-error — testando runtime defense
      expect(() => TargetingRule.criar({ scope: 'INVALID', scopeId: 'x' })).toThrow();
    });
  });

  describe('igualdade', () => {
    it('duas TargetingRule com mesmo (scope, scopeId) são iguais', () => {
      const a = TargetingRule.criar({ scope: 'RESTAURANT', scopeId: 'rest_aurora' });
      const b = TargetingRule.criar({ scope: 'RESTAURANT', scopeId: 'rest_aurora' });
      expect(a.equals(b)).toBe(true);
    });

    it('TargetingRule com scopeId diferente não são iguais', () => {
      const a = TargetingRule.criar({ scope: 'RESTAURANT', scopeId: 'rest_aurora' });
      const b = TargetingRule.criar({ scope: 'RESTAURANT', scopeId: 'rest_polaris' });
      expect(a.equals(b)).toBe(false);
    });
  });
});
