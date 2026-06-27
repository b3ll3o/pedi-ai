/**
 * @spec(RF-ADM-FF-03)
 *
 * Testes do Value Object `FlagKey` (apps/api/src/domain/admin/feature-flags/value-objects/FlagKey.ts).
 *
 * Cobertura:
 *  - Construtor aceita chaves snake_case válidas (^[a-z0-9_]{3,64}$).
 *  - Rejeita chaves inválidas (maiúsculas, hífens, comprimento, vazias).
 *  - Igualdade por valor (VO é imutável).
 *  - Serialização toString() preserva valor canônico.
 */
import { describe, it, expect } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { FlagKey } from '../../../../../../src/domain/admin/feature-flags/value-objects/FlagKey';

describe('FlagKey (value object)', () => {
  describe('criação válida', () => {
    it('aceita chave snake_case simples de 3 caracteres', () => {
      const key = FlagKey.criar('abc');
      expect(key.valor).toBe('abc');
    });

    it('aceita chave snake_case com números', () => {
      const key = FlagKey.criar('pix_enabled_v2');
      expect(key.valor).toBe('pix_enabled_v2');
    });

    it('aceita chave com 64 caracteres (limite máximo)', () => {
      const longKey = 'a'.repeat(64);
      const key = FlagKey.criar(longKey);
      expect(key.valor).toBe(longKey);
      expect(key.valor.length).toBe(64);
    });
  });

  describe('criação inválida', () => {
    it('rejeita chave vazia', () => {
      expect(() => FlagKey.criar('')).toThrow(/key/i);
    });

    it('rejeita chave com 2 caracteres (abaixo do mínimo)', () => {
      expect(() => FlagKey.criar('ab')).toThrow(/3 a 64|min/i);
    });

    it('rejeita chave com 65 caracteres (acima do máximo)', () => {
      expect(() => FlagKey.criar('a'.repeat(65))).toThrow(/3 a 64|max|64/i);
    });

    it('rejeita chave com letras maiúsculas', () => {
      expect(() => FlagKey.criar('PIX_ENABLED')).toThrow(/snake_case|lowercase|minúsculo/i);
    });

    it('rejeita chave com hífen', () => {
      expect(() => FlagKey.criar('pix-enabled')).toThrow(/snake_case|hífen/i);
    });

    it('rejeita chave com espaço', () => {
      expect(() => FlagKey.criar('pix enabled')).toThrow(/snake_case|inválid/i);
    });

    it('rejeita chave com caractere especial (@, !, #)', () => {
      expect(() => FlagKey.criar('pix@enabled')).toThrow();
      expect(() => FlagKey.criar('pix!')).toThrow();
      expect(() => FlagKey.criar('pix#abc')).toThrow();
    });

    it('rejeita chave começando com número? — documento define ^[a-z0-9_], então aceita', () => {
      // Conforme regex do design §5: ^[a-z0-9_]{3,64}$. Números no início são aceitos.
      const key = FlagKey.criar('1ab');
      expect(key.valor).toBe('1ab');
    });
  });

  describe('imutabilidade e igualdade', () => {
    it('duas FlagKey com mesmo valor são iguais (equals → true)', () => {
      const a = FlagKey.criar('pix_enabled');
      const b = FlagKey.criar('pix_enabled');
      expect(a.equals(b)).toBe(true);
    });

    it('FlagKey com valores diferentes não são iguais', () => {
      const a = FlagKey.criar('pix_enabled');
      const b = FlagKey.criar('combo_enabled');
      expect(a.equals(b)).toBe(false);
    });

    it('toString retorna o valor canônico', () => {
      const key = FlagKey.criar('multi_restaurant_enabled');
      expect(key.toString()).toBe('multi_restaurant_enabled');
    });
  });
});
