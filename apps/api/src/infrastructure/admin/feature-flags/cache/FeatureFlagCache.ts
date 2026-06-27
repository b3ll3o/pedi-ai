/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, RNF-AVAIL-FF-01)
 *
 * Cache de feature flags com fallback graceful:
 *   - Camada 1: Redis (com prefixo `ff:` e TTL configurável, default 60s)
 *   - Camada 2: LRU in-process (maxEntries configurável, default 1000)
 *
 * Comportamento:
 *   - `get(key)`: tenta Redis → fallback LRU → null
 *   - `set(key, value)`: escreve em AMBAS (escrita em Redis é best-effort)
 *   - `invalidate(key)`: deleta de AMBAS (RNF-AVAIL-FF-01)
 *   - Falha de Redis é logada como warning — sem throw (graceful degradation)
 *
 * O cache armazena snapshots serializáveis (plain JSON) — não objetos
 * do domínio com métodos.
 */

import { Logger } from '@nestjs/common';

import type { FlagScopeType } from '../../../../domain/admin/feature-flags/value-objects/TargetingRule';

export interface CacheableFlagSnapshot {
  id: string;
  key: string;
  enabled: boolean;
  defaultValue: unknown;
  valueType: 'BOOLEAN' | 'STRING' | 'NUMBER' | 'JSON';
  overrides: Array<{
    id: string;
    scope: FlagScopeType;
    scopeId: string | null;
    value: unknown;
    rolloutPct?: number | null;
    expiresAt?: Date | string | null;
  }>;
}

export interface CacheLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttl: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface FeatureFlagCacheOptions {
  ttlSeconds: number;
  prefix: string;
  maxLocalEntries?: number;
}

interface LocalEntry {
  value: CacheableFlagSnapshot;
  expiresAt: number;
}

/**
 * Cache simples de feature flags com fallback LRU.
 */
export class FeatureFlagCache {
  private readonly logger = new Logger(FeatureFlagCache.name);
  private readonly local: Map<string, LocalEntry> = new Map();
  private readonly ttlSeconds: number;
  private readonly prefix: string;
  private readonly maxLocalEntries: number;
  private redisAvailable = true;

  constructor(
    private readonly redis: CacheLike | null,
    options: FeatureFlagCacheOptions
  ) {
    this.ttlSeconds = options.ttlSeconds;
    this.prefix = options.prefix;
    this.maxLocalEntries = options.maxLocalEntries ?? 1000;
  }

  private prefixed(key: string): string {
    return `${this.prefix}${key}`;
  }

  private serialize(value: CacheableFlagSnapshot): string {
    return JSON.stringify(value);
  }

  private deserialize(raw: string): CacheableFlagSnapshot {
    return JSON.parse(raw) as CacheableFlagSnapshot;
  }

  /**
   * Recupera um snapshot. Tenta Redis primeiro; em falha, cai para LRU local.
   */
  async get(key: string): Promise<CacheableFlagSnapshot | null> {
    const k = this.prefixed(key);

    if (this.redis && this.redisAvailable) {
      try {
        const raw = await this.redis.get(k);
        if (raw) {
          const parsed = this.deserialize(raw);
          // re-popula LRU
          this.setLocal(key, parsed);
          return parsed;
        }
        // miss Redis — tenta LRU
      } catch (err) {
        this.redisAvailable = false;
        this.logger.warn(
          `FeatureFlagCache: Redis indisponível, usando apenas LRU in-process (${(err as Error).message})`
        );
      }
    }

    return this.getLocal(key);
  }

  /**
   * Persiste em AMBAS camadas (Redis é best-effort).
   */
  async set(key: string, value: CacheableFlagSnapshot): Promise<void> {
    this.setLocal(key, value);
    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.set(this.prefixed(key), this.serialize(value), 'EX', this.ttlSeconds);
      } catch (err) {
        this.redisAvailable = false;
        this.logger.warn(
          `FeatureFlagCache: Redis indisponível no set, usando LRU in-process (${(err as Error).message})`
        );
      }
    }
  }

  /**
   * Invalida AMBAS camadas.
   */
  async invalidate(key: string): Promise<void> {
    this.local.delete(key);
    if (this.redis && this.redisAvailable) {
      try {
        await this.redis.del(this.prefixed(key));
      } catch (err) {
        this.redisAvailable = false;
        this.logger.warn(
          `FeatureFlagCache: Redis indisponível no invalidate (${(err as Error).message})`
        );
      }
    }
  }

  // ── LRU helpers ────────────────────────────────────────────

  /**
   * Set apenas no LRU (usado para hidratação e testes).
   */
  async setLocal(key: string, value: CacheableFlagSnapshot): Promise<void> {
    if (this.local.has(key)) {
      this.local.delete(key); // re-insert para mover ao fim (LRU)
    } else if (this.local.size >= this.maxLocalEntries) {
      // expulsa o mais antigo (primeira chave do Map)
      const oldest = this.local.keys().next().value;
      if (oldest !== undefined) {
        this.local.delete(oldest);
      }
    }
    this.local.set(key, {
      value,
      expiresAt: Date.now() + this.ttlSeconds * 1000,
    });
  }

  async getLocal(key: string): Promise<CacheableFlagSnapshot | null> {
    const entry = this.local.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.local.delete(key);
      return null;
    }
    // move ao fim (LRU)
    this.local.delete(key);
    this.local.set(key, entry);
    return entry.value;
  }
}
