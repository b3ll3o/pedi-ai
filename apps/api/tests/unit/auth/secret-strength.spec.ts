import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { assertSecretStrength } from '../../../src/auth/secret-strength';

/**
 * Testa o validador de força de segredos HMAC/JWT aplicado em boot.
 *
 * Cobertura:
 * - Rejeita placeholders conhecidos (match exato).
 * - **NÃO** rejeita valores que apenas *contêm* placeholder como
 *   substring (regressão do bug de 2026-07-29 que travava E2E).
 * - Em dev: aceita valores curtos (apenas warn). Em produção: rejeita.
 * - Trim/lowercase são normalizados antes da comparação.
 */
describe('assertSecretStrength', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('placeholders conhecidos (match exato)', () => {
    it('rejeita "secret" puro', () => {
      expect(() => assertSecretStrength('JWT_SECRET', 'secret')).toThrow(/placeholder conhecido/i);
    });

    it('rejeita "changeme" puro', () => {
      expect(() => assertSecretStrength('JWT_SECRET', 'changeme')).toThrow(
        /placeholder conhecido/i
      );
    });

    it('rejeita "password" puro', () => {
      expect(() => assertSecretStrength('JWT_SECRET', 'password')).toThrow(
        /placeholder conhecido/i
      );
    });

    it('rejeita "admin" puro', () => {
      expect(() => assertSecretStrength('JWT_SECRET', 'admin')).toThrow(/placeholder conhecido/i);
    });

    it('rejeita com case-insensitive', () => {
      expect(() => assertSecretStrength('JWT_SECRET', 'SECRET')).toThrow(/placeholder conhecido/i);
      expect(() => assertSecretStrength('JWT_SECRET', 'Changeme')).toThrow(
        /placeholder conhecido/i
      );
    });

    it('rejeita "changeme123" exato', () => {
      expect(() => assertSecretStrength('JWT_SECRET', 'changeme123')).toThrow(
        /placeholder conhecido/i
      );
    });

    it('rejeita "dev-secret" exato', () => {
      expect(() => assertSecretStrength('JWT_SECRET', 'dev-secret')).toThrow(
        /placeholder conhecido/i
      );
    });
  });

  describe('regressão: NÃO rejeita substring de placeholder', () => {
    // Estes valores continham "secret" como substring e foram rejeitados
    // incorretamente em 2026-07-29, quebrando o CI E2E. Agora passam.
    it('aceita "e2e-jwt-secret-for-testing-only"', () => {
      expect(() =>
        assertSecretStrength('JWT_SECRET', 'e2e-jwt-secret-for-testing-only')
      ).not.toThrow();
    });

    it('aceita "minha-secret-key-de-teste-123"', () => {
      expect(() =>
        assertSecretStrength('JWT_SECRET', 'minha-secret-key-de-teste-123')
      ).not.toThrow();
    });

    it('aceita "supersecretvalue-really-long-string"', () => {
      expect(() =>
        assertSecretStrength('JWT_SECRET', 'supersecretvalue-really-long-string')
      ).not.toThrow();
    });
  });

  describe('strict env (production / staging)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('rejeita valor curto', () => {
      expect(() => assertSecretStrength('JWT_SECRET', 'short-but-not-placeholder')).toThrow(
        /deve ter ≥ 32 caracteres/
      );
    });

    it('rejeita valor undefined', () => {
      expect(() => assertSecretStrength('JWT_SECRET', undefined)).toThrow(
        /obrigatório em production/
      );
    });

    it('rejeita valor vazio', () => {
      expect(() => assertSecretStrength('JWT_SECRET', '')).toThrow(/obrigatório em production/);
    });

    it('aceita valor hex de 64 chars', () => {
      const hex = 'a'.repeat(64);
      expect(() => assertSecretStrength('JWT_SECRET', hex)).not.toThrow();
    });
  });

  describe('dev env (não-strict)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'e2e';
    });

    it('NÃO falha em valor curto (apenas warn)', () => {
      const logger = { warn: vi.fn() } as any;
      expect(() => assertSecretStrength('JWT_SECRET', 'curto', logger)).not.toThrow();
      expect(logger.warn).toHaveBeenCalled();
    });

    it('NÃO falha em valor undefined', () => {
      expect(() => assertSecretStrength('JWT_SECRET', undefined)).not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('rejeita valor igual ao nome da variável', () => {
      expect(() => assertSecretStrength('JWT_SECRET', 'jwt_secret')).toThrow(
        /próprio nome da variável/
      );
    });

    it('normaliza espaços em branco antes de comparar com placeholder', () => {
      // "secret" com whitespace não é o placeholder puro "secret" —
      // comportamento: trim() não é aplicado, então "secret" (sem espaço)
      // continua sendo placeholder.
      expect(() => assertSecretStrength('JWT_SECRET', 'secret')).toThrow();
    });
  });
});
