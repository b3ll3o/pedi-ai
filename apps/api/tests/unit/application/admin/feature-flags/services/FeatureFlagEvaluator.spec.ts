/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, RNF-AVAIL-FF-01)
 *
 * TDD puro — FeatureFlagEvaluator (núcleo do sistema).
 *
 * Cobre EXATAMENTE a precedência do design.md §6.1:
 *   1. enabled = false ⇒ defaultValue (curto-circuito antes da cadeia)
 *   2. USER (restaurantId+userId)
 *   3. RESTAURANT
 *   4. USER (userId puro)
 *   5. GLOBAL
 *   6. defaultValue
 *
 * Implementação esperada em:
 *   apps/api/src/application/admin/feature-flags/services/FeatureFlagEvaluator.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { FeatureFlagEvaluator } from '../../../../../../src/application/admin/feature-flags/services/FeatureFlagEvaluator';

type Scope = 'GLOBAL' | 'RESTAURANT' | 'USER';

interface OverrideStub {
  id: string;
  scope: Scope;
  scopeId: string | null;
  value: unknown;
  rolloutPct?: number;
  expiresAt?: Date;
}

interface FlagStub {
  id: string;
  key: string;
  enabled: boolean;
  defaultValue: unknown;
  overrides: OverrideStub[];
}

interface RepoStub {
  findByKey(key: string): Promise<FlagStub | null>;
}

interface CacheStub {
  get(key: string): FlagStub | null;
  set(key: string, flag: FlagStub): void;
  invalidate(key: string): void;
}

interface EnvFallbackStub {
  lookup(key: string): unknown;
}

function makeFlag(partial: Partial<FlagStub> = {}): FlagStub {
  return {
    id: partial.id ?? 'flag_1',
    key: partial.key ?? 'pix_enabled',
    enabled: partial.enabled ?? true,
    defaultValue: partial.defaultValue ?? false,
    overrides: partial.overrides ?? [],
  };
}

function makeEvaluator(repo: RepoStub, cache: CacheStub, envFallback: EnvFallbackStub) {
  return new FeatureFlagEvaluator(repo, cache, envFallback);
}

describe('FeatureFlagEvaluator (RF-ADM-FF-08)', () => {
  let repo: RepoStub;
  let cache: CacheStub;
  let envFallback: EnvFallbackStub;

  beforeEach(() => {
    repo = {
      findByKey: vi.fn().mockResolvedValue(null),
    };
    cache = {
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      invalidate: vi.fn(),
    };
    envFallback = {
      lookup: vi.fn().mockReturnValue(undefined),
    };
  });

  // ────────────────────────────────────────────────────────────
  // enabled = false (curto-circuito absoluto)
  // ────────────────────────────────────────────────────────────
  describe('enabled = false', () => {
    it('retorna defaultValue mesmo com override aplicável', async () => {
      const flag = makeFlag({
        enabled: false,
        defaultValue: false,
        overrides: [{ id: 'o1', scope: 'GLOBAL', scopeId: null, value: true }],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', { restaurantId: 'rest_aurora' });
      expect(result).toBe(false);
    });

    it('ignora precedência completa e consulta apenas defaultValue', async () => {
      const flag = makeFlag({
        enabled: false,
        defaultValue: false,
        overrides: [
          { id: 'o1', scope: 'USER', scopeId: 'rest_aurora:user_42', value: true },
          { id: 'o2', scope: 'RESTAURANT', scopeId: 'rest_aurora', value: true },
          { id: 'o3', scope: 'GLOBAL', scopeId: null, value: true },
        ],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', {
        restaurantId: 'rest_aurora',
        userId: 'user_42',
      });
      expect(result).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────
  // Precedência completa
  // ────────────────────────────────────────────────────────────
  describe('ordem de precedência', () => {
    it('1) USER(restaurantId+userId) > RESTAURANT', async () => {
      const flag = makeFlag({
        overrides: [
          { id: 'r', scope: 'RESTAURANT', scopeId: 'rest_aurora', value: false },
          { id: 'u', scope: 'USER', scopeId: 'rest_aurora:user_42', value: true },
        ],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', {
        restaurantId: 'rest_aurora',
        userId: 'user_42',
      });
      expect(result).toBe(true); // USER composto vence
    });

    it('2) RESTAURANT > USER(userId puro)', async () => {
      const flag = makeFlag({
        overrides: [
          { id: 'u', scope: 'USER', scopeId: 'user_42', value: false },
          { id: 'r', scope: 'RESTAURANT', scopeId: 'rest_aurora', value: true },
        ],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', {
        restaurantId: 'rest_aurora',
        userId: 'user_42',
      });
      expect(result).toBe(true); // RESTAURANT vence
    });

    it('3) USER(userId puro) > GLOBAL quando sem contexto de restaurante', async () => {
      const flag = makeFlag({
        overrides: [
          { id: 'g', scope: 'GLOBAL', scopeId: null, value: false },
          { id: 'u', scope: 'USER', scopeId: 'user_42', value: true },
        ],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', { userId: 'user_42' });
      expect(result).toBe(true); // USER puro vence sobre GLOBAL
    });

    it('4) GLOBAL aplicado quando nenhum override mais específico bate', async () => {
      const flag = makeFlag({
        overrides: [{ id: 'g', scope: 'GLOBAL', scopeId: null, value: true }],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', {
        restaurantId: 'rest_aurora',
        userId: 'user_42',
      });
      expect(result).toBe(true);
    });

    it('5) Sem override aplicável retorna defaultValue', async () => {
      const flag = makeFlag({
        defaultValue: true,
        overrides: [{ id: 'o', scope: 'RESTAURANT', scopeId: 'rest_outra', value: false }],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', { restaurantId: 'rest_aurora' });
      expect(result).toBe(true); // defaultValue (override não casa)
    });

    it('ignora overrides expirados na cadeia de precedência', async () => {
      const flag = makeFlag({
        defaultValue: false,
        overrides: [
          {
            id: 'exp',
            scope: 'GLOBAL',
            scopeId: null,
            value: true,
            expiresAt: new Date('2020-01-01'),
          },
        ],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', {});
      expect(result).toBe(false); // override expirado ⇒ defaultValue
    });
  });

  // ────────────────────────────────────────────────────────────
  // Rollout determinístico (FNV-1a)
  // ────────────────────────────────────────────────────────────
  describe('rollout determinístico', () => {
    it('mesma chave+userId retorna mesmo valor em 100 invocações', async () => {
      const flag = makeFlag({
        overrides: [{ id: 'r', scope: 'USER', scopeId: 'user_42', value: true, rolloutPct: 50 }],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const results = await Promise.all(
        Array.from({ length: 100 }, () => evaluator.evaluate('pix_enabled', { userId: 'user_42' }))
      );
      const unicos = Array.from(new Set(results));
      expect(unicos.length).toBe(1);
    });

    it('rolloutPct=100 sempre aplica', async () => {
      const flag = makeFlag({
        overrides: [{ id: 'r', scope: 'GLOBAL', scopeId: null, value: true, rolloutPct: 100 }],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      for (let i = 0; i < 20; i++) {
        const r = await evaluator.evaluate('pix_enabled', { userId: `user_${i}` });
        expect(r).toBe(true);
      }
    });

    it('rolloutPct=0 nunca aplica (cai para próxima regra)', async () => {
      const flag = makeFlag({
        defaultValue: false,
        overrides: [{ id: 'g', scope: 'GLOBAL', scopeId: null, value: true, rolloutPct: 0 }],
      });
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', { userId: 'user_42' });
      expect(result).toBe(false); // rolloutPct=0 ⇒ defaultValue
    });
  });

  // ────────────────────────────────────────────────────────────
  // Cache + Fallback (RNF-PERF-FF-01, RNF-AVAIL-FF-01)
  // ────────────────────────────────────────────────────────────
  describe('cache + fallback', () => {
    it('usa cache quando presente (não consulta repo)', async () => {
      const cached = makeFlag({ key: 'pix_enabled', defaultValue: true });
      cache.get = vi.fn().mockReturnValue(cached);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', {});
      expect(result).toBe(true);
      expect(repo.findByKey).not.toHaveBeenCalled();
    });

    it('preenche cache após cache miss', async () => {
      const flag = makeFlag();
      repo.findByKey = vi.fn().mockResolvedValue(flag);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      await evaluator.evaluate('pix_enabled', {});
      expect(cache.set).toHaveBeenCalledWith('pix_enabled', flag);
    });

    it('cai para env-var quando flag não existe no DB nem cache', async () => {
      repo.findByKey = vi.fn().mockResolvedValue(null);
      envFallback.lookup = vi.fn().mockReturnValue(true);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', {});
      expect(result).toBe(true);
    });

    it('cai para env-var quando DB lança erro (RNF-AVAIL-FF-01)', async () => {
      repo.findByKey = vi.fn().mockRejectedValue(new Error('DB down'));
      envFallback.lookup = vi.fn().mockReturnValue(true);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', {});
      expect(result).toBe(true);
    });

    it('retorna false como último recurso quando nada está disponível', async () => {
      repo.findByKey = vi.fn().mockRejectedValue(new Error('DB down'));
      envFallback.lookup = vi.fn().mockReturnValue(undefined);
      const evaluator = makeEvaluator(repo, cache, envFallback);

      const result = await evaluator.evaluate('pix_enabled', {});
      expect(result).toBe(false);
    });
  });
});
