/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, F5)
 *
 * Testes do `FeatureFlagMetrics` — contador/histograma in-memory.
 * Cobre incremento, render Prometheus e snapshot.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// @ts-expect-error — módulo ainda não implementado (TDD: RED)
import { FeatureFlagMetrics } from '../../../../../../src/infrastructure/admin/feature-flags/telemetry/feature-flag.metrics';

describe('FeatureFlagMetrics', () => {
  let metrics: FeatureFlagMetrics;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T12:00:00Z'));
    metrics = new FeatureFlagMetrics();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('incrementEvaluation', () => {
    it('registra uma avaliação', () => {
      metrics.incrementEvaluation({ key: 'pix_enabled', scope: 'GLOBAL', hit: true });
      const snap = metrics.snapshot();
      expect(snap.totalEvaluations).toBe(1);
      expect(snap.perFlag['pix_enabled']?.evaluations).toBe(1);
    });

    it('agrega múltiplas avaliações da mesma flag', () => {
      metrics.incrementEvaluation({ key: 'pix_enabled', scope: 'GLOBAL', hit: true });
      metrics.incrementEvaluation({ key: 'pix_enabled', scope: 'RESTAURANT', hit: false });
      metrics.incrementEvaluation({ key: 'pix_enabled', scope: 'GLOBAL', hit: true });
      const snap = metrics.snapshot();
      expect(snap.totalEvaluations).toBe(3);
      expect(snap.perFlag['pix_enabled']?.evaluations).toBe(3);
    });

    it('mantém flags distintas separadas no snapshot', () => {
      metrics.incrementEvaluation({ key: 'pix_enabled', scope: 'GLOBAL', hit: true });
      metrics.incrementEvaluation({ key: 'combos_enabled', scope: 'GLOBAL', hit: false });
      const snap = metrics.snapshot();
      expect(snap.perFlag['pix_enabled']?.evaluations).toBe(1);
      expect(snap.perFlag['combos_enabled']?.evaluations).toBe(1);
    });
  });

  describe('incrementCacheHit / Miss / Fallback', () => {
    it('conta cache hits', () => {
      metrics.incrementCacheHit();
      metrics.incrementCacheHit();
      expect(metrics.snapshot().cacheHits).toBe(2);
    });

    it('conta cache misses', () => {
      metrics.incrementCacheMiss();
      expect(metrics.snapshot().cacheMisses).toBe(1);
    });

    it('conta fallbacks (reason é ignorado por enquanto)', () => {
      metrics.incrementFallback('redis-down');
      metrics.incrementFallback('ttl-expired');
      expect(metrics.snapshot().fallbacks).toBe(2);
    });
  });

  describe('render (formato Prometheus)', () => {
    it('retorna string não vazia com cabeçalhos Prometheus', () => {
      const out = metrics.render();
      expect(out).toContain('# HELP feature_flag_evaluations_total');
      expect(out).toContain('# TYPE feature_flag_evaluations_total counter');
      expect(out).toContain('# HELP feature_flag_cache_hits_total');
      expect(out).toContain('# TYPE feature_flag_cache_hits_total counter');
      expect(out).toContain('# HELP feature_flag_cache_misses_total');
      expect(out).toContain('# HELP feature_flag_fallback_total');
    });

    it('serializa avaliações agregando por (key, scope, hit)', () => {
      metrics.incrementEvaluation({ key: 'pix_enabled', scope: 'GLOBAL', hit: true });
      metrics.incrementEvaluation({ key: 'pix_enabled', scope: 'GLOBAL', hit: true });
      metrics.incrementEvaluation({ key: 'pix_enabled', scope: 'RESTAURANT', hit: false });

      const out = metrics.render();
      expect(out).toMatch(
        /feature_flag_evaluations_total\{flag_key="pix_enabled",scope="GLOBAL",hit="true"\} 2/
      );
      expect(out).toMatch(
        /feature_flag_evaluations_total\{flag_key="pix_enabled",scope="RESTAURANT",hit="false"\} 1/
      );
    });

    it('serializa cache hits/misses/fallbacks', () => {
      metrics.incrementCacheHit();
      metrics.incrementCacheHit();
      metrics.incrementCacheMiss();
      metrics.incrementFallback('redis-down');

      const out = metrics.render();
      expect(out).toContain('feature_flag_cache_hits_total{layer="lru"} 2');
      expect(out).toContain('feature_flag_cache_misses_total 1');
      expect(out).toContain('feature_flag_fallback_total{reason="any"} 1');
    });

    it('escapa aspas duplas em label values', () => {
      metrics.incrementEvaluation({ key: 'has"quote', scope: 'GLOBAL', hit: true });
      const out = metrics.render();
      expect(out).toContain('flag_key="has\\"quote"');
    });
  });

  describe('snapshot', () => {
    it('retorna totais zerados inicialmente', () => {
      const snap = metrics.snapshot();
      expect(snap.totalEvaluations).toBe(0);
      expect(snap.cacheHits).toBe(0);
      expect(snap.cacheMisses).toBe(0);
      expect(snap.fallbacks).toBe(0);
      expect(snap.perFlag).toEqual({});
    });

    it('snapshot reflete estado atual dos contadores', () => {
      metrics.incrementEvaluation({ key: 'a', scope: 'GLOBAL', hit: true });
      metrics.incrementEvaluation({ key: 'b', scope: 'GLOBAL', hit: true });
      metrics.incrementEvaluation({ key: 'b', scope: 'GLOBAL', hit: false });
      metrics.incrementCacheHit();
      metrics.incrementCacheMiss();
      metrics.incrementFallback('any');

      const snap = metrics.snapshot();
      expect(snap.totalEvaluations).toBe(3);
      expect(snap.cacheHits).toBe(1);
      expect(snap.cacheMisses).toBe(1);
      expect(snap.fallbacks).toBe(1);
      expect(snap.perFlag['a']?.evaluations).toBe(1);
      expect(snap.perFlag['b']?.evaluations).toBe(2);
    });
  });

  describe('exportToRegistry', () => {
    it('não lança com registry mock (no-op stub)', () => {
      const registry = {
        getSingleMetric: vi.fn(),
        registerMetric: vi.fn(),
      };
      expect(() => metrics.exportToRegistry(registry)).not.toThrow();
    });
  });
});
