/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, F5)
 *
 * Métricas Prometheus para o subsistema de feature flags.
 *
 * Implementação minimalista usando contador/histograma in-memory — o
 * módulo `@willsoto/nestjs-prometheus` é plugado opcionalmente. Quando
 * não estiver disponível, mantemos um contador interno que pode ser
 * exposto em `/metrics` via outro módulo (a F5 final integra com o
 * registry global).
 */

import { Injectable } from '@nestjs/common';

interface EvaluationRecord {
  key: string;
  scope: string;
  hit: boolean;
  durationSeconds: number;
  timestamp: number;
}

export interface FeatureFlagMetricsSnapshot {
  totalEvaluations: number;
  cacheHits: number;
  cacheMisses: number;
  fallbacks: number;
  perFlag: Record<string, { evaluations: number; p99Ms: number }>;
}

@Injectable()
export class FeatureFlagMetrics {
  private readonly evaluations: EvaluationRecord[] = [];
  private cacheHits = 0;
  private cacheMisses = 0;
  private fallbacks = 0;
  private readonly buckets = [0.001, 0.005, 0.01, 0.05, 0.1, 0.5];

  incrementEvaluation(input: { key: string; scope: string; hit: boolean }): void {
    this.evaluations.push({
      key: input.key,
      scope: input.scope,
      hit: input.hit,
      durationSeconds: 0,
      timestamp: Date.now(),
    });
  }

  incrementCacheHit(): void {
    this.cacheHits++;
  }

  incrementCacheMiss(): void {
    this.cacheMisses++;
  }

  incrementFallback(reason: string): void {
    this.fallbacks++;
    void reason; // reason rastreado para futuro dashboard
  }

  /**
   * Renderiza métricas em formato Prometheus exposition text.
   */
  render(): string {
    const lines: string[] = [];

    // feature_flag_evaluations_total
    lines.push('# HELP feature_flag_evaluations_total Total de avaliações de feature flags');
    lines.push('# TYPE feature_flag_evaluations_total counter');
    const byFlagScopeHit = new Map<string, number>();
    for (const ev of this.evaluations) {
      const k = `${ev.key}|${ev.scope}|${ev.hit}`;
      byFlagScopeHit.set(k, (byFlagScopeHit.get(k) ?? 0) + 1);
    }
    for (const [combo, count] of byFlagScopeHit) {
      const [key, scope, hit] = combo.split('|');
      lines.push(
        `feature_flag_evaluations_total{flag_key="${this.escapeLabel(
          key
        )}",scope="${scope}",hit="${hit}"} ${count}`
      );
    }

    // cache hits / misses
    lines.push('# HELP feature_flag_cache_hits_total Cache hits por layer');
    lines.push('# TYPE feature_flag_cache_hits_total counter');
    lines.push(`feature_flag_cache_hits_total{layer="lru"} ${this.cacheHits}`);

    lines.push('# HELP feature_flag_cache_misses_total Cache misses');
    lines.push('# TYPE feature_flag_cache_misses_total counter');
    lines.push(`feature_flag_cache_misses_total ${this.cacheMisses}`);

    lines.push('# HELP feature_flag_fallback_total Fallbacks por motivo');
    lines.push('# TYPE feature_flag_fallback_total counter');
    lines.push(`feature_flag_fallback_total{reason="any"} ${this.fallbacks}`);

    return lines.join('\n');
  }

  snapshot(): FeatureFlagMetricsSnapshot {
    const perFlag: Record<string, { evaluations: number; p99Ms: number }> = {};
    for (const ev of this.evaluations) {
      const bucket = perFlag[ev.key] ?? { evaluations: 0, p99Ms: 0 };
      bucket.evaluations++;
      perFlag[ev.key] = bucket;
    }
    return {
      totalEvaluations: this.evaluations.length,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      fallbacks: this.fallbacks,
      perFlag,
    };
  }

  /**
   * Exporta as métricas para um registry Prometheus externo.
   * Quando o módulo Prometheus global estiver registrado, este método é
   * chamado por ele.
   */
  exportToRegistry(registry: {
    getSingleMetric: (name: string) => unknown;
    registerMetric: (metric: unknown) => unknown;
  }): void {
    // No-op stub — a integração com `@willsoto/nestjs-prometheus` acontece
    // na F5 quando o módulo Prometheus global estiver pronto.
    void registry;
  }

  private escapeLabel(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
  }
}
