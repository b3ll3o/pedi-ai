/**
 * @spec(RF-ADM-FF-03, RF-ADM-FF-04)
 *
 * Testes do Value Object `FlagValue` — wrapper tipado para BOOLEAN | STRING | NUMBER | JSON.
 * Garante invariante: valor compatível com valueType declarado.
 */
import { describe, it, expect } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { FlagValue } from '../../../../../../src/domain/admin/feature-flags/value-objects/FlagValue';

describe('FlagValue (value object)', () => {
  describe('BOOLEAN', () => {
    it('aceita true e false', () => {
      expect(FlagValue.criar('BOOLEAN', true).valor).toBe(true);
      expect(FlagValue.criar('BOOLEAN', false).valor).toBe(false);
    });

    it('rejeita string "true" (deve ser boolean nativo)', () => {
      // @ts-expect-error — testando runtime defense
      expect(() => FlagValue.criar('BOOLEAN', 'true')).toThrow(/BOOLEAN|boolean/i);
    });

    it('rejeita número', () => {
      // @ts-expect-error — testando runtime defense
      expect(() => FlagValue.criar('BOOLEAN', 1)).toThrow(/BOOLEAN|boolean/i);
    });
  });

  describe('STRING', () => {
    it('aceita string não-vazia', () => {
      expect(FlagValue.criar('STRING', 'valor-texto').valor).toBe('valor-texto');
    });

    it('aceita string vazia? — por design deve aceitar (string é string)', () => {
      // Decisão de design: string vazia é válida (ex.: placeholder de copy).
      expect(FlagValue.criar('STRING', '').valor).toBe('');
    });

    it('rejeita número', () => {
      // @ts-expect-error — testando runtime defense
      expect(() => FlagValue.criar('STRING', 123)).toThrow(/STRING|string/i);
    });
  });

  describe('NUMBER', () => {
    it('aceita inteiro', () => {
      expect(FlagValue.criar('NUMBER', 42).valor).toBe(42);
    });

    it('aceita ponto flutuante', () => {
      expect(FlagValue.criar('NUMBER', 3.14).valor).toBe(3.14);
    });

    it('aceita zero', () => {
      expect(FlagValue.criar('NUMBER', 0).valor).toBe(0);
    });

    it('aceita negativos', () => {
      expect(FlagValue.criar('NUMBER', -10).valor).toBe(-10);
    });

    it('rejeita string', () => {
      // @ts-expect-error — testando runtime defense
      expect(() => FlagValue.criar('NUMBER', '42')).toThrow(/NUMBER|number/i);
    });

    it('rejeita boolean', () => {
      // @ts-expect-error — testando runtime defense
      expect(() => FlagValue.criar('NUMBER', true)).toThrow(/NUMBER|number/i);
    });
  });

  describe('JSON', () => {
    it('aceita objeto', () => {
      const v = { tier: 'pro', retries: 3 };
      expect(FlagValue.criar('JSON', v).valor).toEqual(v);
    });

    it('aceita array', () => {
      expect(FlagValue.criar('JSON', [1, 2, 3]).valor).toEqual([1, 2, 3]);
    });

    it('rejeita primitivo simples (string, number, boolean)', () => {
      // @ts-expect-error — testando runtime defense
      expect(() => FlagValue.criar('JSON', 'texto')).toThrow(/JSON|objeto/i);
    });
  });

  describe('valueType desconhecido', () => {
    it('rejeita valueType fora do enum', () => {
      // @ts-expect-error — testando runtime defense
      expect(() => FlagValue.criar('UNKNOWN', 'x')).toThrow();
    });
  });
});
