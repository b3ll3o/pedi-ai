/**
 * Suporte BDD — stub de FeatureFlagMetrics.
 *
 * Captura incrementos das métricas Prometheus sem expor o client.
 * O use case AvaliarFeatureFlagsUseCase consome este stub via duck-typing.
 */

export interface EvalMetric {
  key: string;
  scope: string;
  hit: boolean;
}

export interface FallbackMetric {
  reason: string;
  count: number;
}

export interface CacheHitMetric {
  layer: 'redis' | 'lru' | 'miss';
  count: number;
}

export class FeatureFlagMetricsStub {
  evaluations: EvalMetric[] = [];
  fallbacks: Record<string, number> = {};
  cacheHits: Record<string, number> = { redis: 0, lru: 0, miss: 0 };

  reset(): void {
    this.evaluations = [];
    this.fallbacks = {};
    this.cacheHits = { redis: 0, lru: 0, miss: 0 };
  }

  incrementEvaluation(metric: EvalMetric): void {
    this.evaluations.push(metric);
  }

  incrementFallback(reason: string, by = 1): void {
    this.fallbacks[reason] = (this.fallbacks[reason] ?? 0) + by;
  }

  incrementCacheHit(layer: 'redis' | 'lru' | 'miss', by = 1): void {
    this.cacheHits[layer] = (this.cacheHits[layer] ?? 0) + by;
  }
}
