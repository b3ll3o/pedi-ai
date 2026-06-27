/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, RNF-AVAIL-FF-01)
 *
 * Núcleo do sistema de feature flags: `FeatureFlagEvaluator`.
 *
 * Algoritmo (vide design.md §6.1):
 *   1. Se flag.enabled === false → retorna defaultValue (curto-circuito)
 *   2. Procura override na ordem de precedência:
 *      a) USER com scopeId = "<restaurantId>:<userId>"
 *      b) RESTAURANT com scopeId = restaurantId
 *      c) USER com scopeId = userId
 *      d) GLOBAL com scopeId = null
 *   3. Se override tem rolloutPct definido e < 100:
 *      - hash FNV-1a 64-bit de "<flagId>:<subjectId>" % 100
 *      - Se hash < rolloutPct → aplica value; senão, cai para próxima regra
 *   4. Sem override aplicável → defaultValue
 *
 * Estratégia de cache (RF-ADM-FF-08 + RNF-PERF-FF-01):
 *   - Tenta cache primeiro (L1 Redis / L2 LRU).
 *   - Em cache miss, busca no repositório.
 *   - Em DB error → fallback para env-var (RNF-AVAIL-FF-01).
 *   - Em tudo falhar → retorna `false` como último recurso (NÃO null).
 */
import { Logger } from '@nestjs/common';

import type {
  FeatureFlagCache,
  CacheableFlagSnapshot,
} from '../../../../infrastructure/admin/feature-flags/cache/FeatureFlagCache';
import type { IFeatureFlagRepository } from '../../../../domain/admin/feature-flags/repositories/IFeatureFlagRepository';
import type { FlagScopeType } from '../../../../domain/admin/feature-flags/value-objects/TargetingRule';

export interface EvalContext {
  restaurantId?: string;
  userId?: string;
}

interface RepoLike {
  findByKey(key: string): Promise<CacheableFlagSnapshot | null>;
}

interface CacheLike {
  get(key: string): CacheableFlagSnapshot | null;
  set(key: string, flag: CacheableFlagSnapshot): void;
  invalidate(key: string): void;
}

interface EnvFallbackLike {
  lookup(key: string): unknown;
}

/**
 * Hash FNV-1a 64-bit determinístico. Usado pelo rollout %.
 */
export function fnv1a64(input: string): bigint {
  const FNV_OFFSET = 0xcbf29ce484222325n;
  const FNV_PRIME = 0x100000001b3n;

  let hash = FNV_OFFSET;
  const bytes = Buffer.from(input, 'utf8');
  for (const byte of bytes) {
    hash = (hash ^ BigInt(byte)) * FNV_PRIME;
    // manter 64 bits
    hash &= 0xffffffffffffffffn;
  }
  return hash;
}

export class FeatureFlagEvaluator {
  private readonly logger = new Logger(FeatureFlagEvaluator.name);

  constructor(
    private readonly repo: RepoLike,
    private readonly cache: CacheLike,
    private readonly envFallback: EnvFallbackLike
  ) {}

  /**
   * Avalia uma chave e retorna o valor final.
   */
  async evaluate(key: string, ctx: EvalContext): Promise<unknown> {
    const flag = await this.resolveFlag(key);
    if (!flag) {
      const fallback = this.envFallback.lookup(key);
      return fallback !== undefined ? fallback : false;
    }

    if (!flag.enabled) {
      return flag.defaultValue;
    }

    return this.resolveOverride(flag, ctx);
  }

  /** Carrega do cache, com fallback gracioso para repo e env-var. */
  private async resolveFlag(key: string): Promise<CacheableFlagSnapshot | null> {
    const cached = this.cache.get(key);
    if (cached) return cached;

    try {
      const fresh = await this.repo.findByKey(key);
      if (fresh) this.cache.set(key, fresh);
      return fresh;
    } catch (err) {
      this.logger.warn(
        `FeatureFlagEvaluator: repo falhou para '${key}' — usando env-var (${(err as Error).message})`
      );
      return null;
    }
  }

  /** Aplica a ordem de precedência USER(restaurantId+userId) > RESTAURANT > USER(userId) > GLOBAL. */
  private resolveOverride(flag: CacheableFlagSnapshot, ctx: EvalContext): unknown {
    const candidates = this.activeOverrides(flag.overrides);

    const rules: Array<{ scope: 'USER' | 'RESTAURANT' | 'GLOBAL'; scopeId: string | null }> = [];

    if (ctx.restaurantId && ctx.userId) {
      rules.push({ scope: 'USER', scopeId: `${ctx.restaurantId}:${ctx.userId}` });
    }
    if (ctx.restaurantId) {
      rules.push({ scope: 'RESTAURANT', scopeId: ctx.restaurantId });
    }
    if (ctx.userId) {
      rules.push({ scope: 'USER', scopeId: ctx.userId });
    }
    rules.push({ scope: 'GLOBAL', scopeId: null });

    for (const rule of rules) {
      const match = candidates.find((o) => o.scope === rule.scope && o.scopeId === rule.scopeId);
      if (!match) continue;
      const subject = ctx.userId ?? ctx.restaurantId ?? flag.id;
      if (this.passesRollout(match, flag.id, subject)) return match.value;
    }

    return flag.defaultValue;
  }

  /** Filtra overrides não expirados. */
  private activeOverrides(
    overrides: CacheableFlagSnapshot['overrides']
  ): CacheableFlagSnapshot['overrides'] {
    const now = new Date();
    return overrides.filter((o) => {
      if (!o.expiresAt) return true;
      const exp = typeof o.expiresAt === 'string' ? new Date(o.expiresAt) : o.expiresAt;
      return exp > now;
    });
  }

  private passesRollout(
    o: CacheableFlagSnapshot['overrides'][number],
    flagId: string,
    subjectId: string
  ): boolean {
    if (o.rolloutPct == null || o.rolloutPct === 100) return true;
    if (o.rolloutPct === 0) return false;
    const hash = fnv1a64(`${flagId}:${subjectId}`);
    const modulo = Number(hash % 100n);
    return modulo < o.rolloutPct;
  }
}
