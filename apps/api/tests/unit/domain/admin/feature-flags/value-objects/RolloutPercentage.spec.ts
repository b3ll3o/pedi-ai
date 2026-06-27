/**
 * @spec(RF-ADM-FF-05, RF-ADM-FF-08)
 *
 * Testes do Value Object `RolloutPercentage`.
 * Restrição: inteiro no intervalo fechado [0, 100].
 */
import { describe, it, expect } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { RolloutPercentage } from '../../../../../../src/domain/admin/feature-flags/value-objects/RolloutPercentage';

describe('RolloutPercentage (value object)', () => {
  describe('valores válidos', () => {
    it('aceita 0 (rollout desligado)', () => {
      const p = RolloutPercentage.criar(0);
      expect(p.valor).toBe(0);
    });

    it('aceita 100 (rollout total)', () => {
      const p = RolloutPercentage.criar(100);
      expect(p.valor).toBe(100);
    });

    it('aceita valor intermediário (50)', () => {
      const p = RolloutPercentage.criar(50);
      expect(p.valor).toBe(50);
    });

    it('aceita 1 e 99 (limites internos)', () => {
      expect(RolloutPercentage.criar(1).valor).toBe(1);
      expect(RolloutPercentage.criar(99).valor).toBe(99);
    });
  });

  describe('valores inválidos', () => {
    it('rejeita -1', () => {
      expect(() => RolloutPercentage.criar(-1)).toThrow(/0 a 100/i);
    });

    it('rejeita 101', () => {
      expect(() => RolloutPercentage.criar(101)).toThrow(/0 a 100/i);
    });

    it('rejeita número decimal (50.5)', () => {
      expect(() => RolloutPercentage.criar(50.5)).toThrow(/inteiro|integer/i);
    });

    it('rejeita NaN', () => {
      expect(() => RolloutPercentage.criar(Number.NaN)).toThrow(/0 a 100/i);
    });

    it('rejeita Infinity', () => {
      expect(() => RolloutPercentage.criar(Number.POSITIVE_INFINITY)).toThrow(/0 a 100/i);
    });

    it('rejeita tipo não-numérico', () => {
      // @ts-expect-error — testando runtime defense
      expect(() => RolloutPercentage.criar('50')).toThrow();
    });
  });

  describe('métodos utilitários', () => {
    it('isFull() retorna true quando valor === 100', () => {
      expect(RolloutPercentage.criar(100).isFull()).toBe(true);
      expect(RolloutPercentage.criar(99).isFull()).toBe(false);
    });

    it('isZero() retorna true quando valor === 0', () => {
      expect(RolloutPercentage.criar(0).isZero()).toBe(true);
      expect(RolloutPercentage.criar(1).isZero()).toBe(false);
    });
  });
});
