/**
 * Suporte BDD — cache LRU in-process para feature flags.
 *
 * Implementa o contrato síncrono `CacheLike` esperado pelo
 * `FeatureFlagEvaluator` (vide contrato no evaluator). Mantém o estado
 * em memória, isolado por cenário.
 */

import type { CacheableFlagSnapshot } from '../../src/infrastructure/admin/feature-flags/cache/FeatureFlagCache';

interface LocalEntry {
  value: CacheableFlagSnapshot;
  expiresAt: number;
}

export class LruStubCache {
  private readonly local = new Map<string, LocalEntry>();
  readonly hits = { lru: 0, redis: 0, miss: 0 };
  readonly invalidations = new Set<string>();
  redisAvailable = true;

  constructor(
    private readonly ttlSeconds = 60,
    private readonly maxEntries = 1000
  ) {}

  /** hydrate o cache — usado pelos steps "Dado que ... está em cache Redis" */
  prime(key: string, value: CacheableFlagSnapshot): void {
    this.local.set(key, {
      value,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    });
  }

  get(key: string): CacheableFlagSnapshot | null {
    const entry = this.local.get(key);
    if (!entry) {
      this.hits.miss += 1;
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.local.delete(key);
      this.hits.miss += 1;
      return null;
    }
    this.local.delete(key);
    this.local.set(key, entry);
    this.hits.lru += 1;
    return entry.value;
  }

  set(key: string, value: CacheableFlagSnapshot): void {
    if (this.local.has(key)) {
      this.local.delete(key);
    } else if (this.local.size >= this.maxEntries) {
      const oldest = this.local.keys().next().value;
      if (oldest !== undefined) this.local.delete(oldest);
    }
    this.local.set(key, { value, expiresAt: Date.now() + this.ttlSeconds * 1000 });
  }

  invalidate(key: string): void {
    this.local.delete(key);
    this.invalidations.add(key);
  }

  /** exposição de chaves armazenadas para asserts */
  keys(): string[] {
    return Array.from(this.local.keys());
  }

  reset(): void {
    this.local.clear();
    this.hits.lru = 0;
    this.hits.redis = 0;
    this.hits.miss = 0;
    this.invalidations.clear();
    this.redisAvailable = true;
  }

  /** estado de "Redis fora" — usado pelos steps de fallback */
  setRedisDown(down: boolean): void {
    this.redisAvailable = !down;
  }
}
