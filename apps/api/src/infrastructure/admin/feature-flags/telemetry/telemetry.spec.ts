/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, F5)
 *
 * Testes unitários do telemetry do avaliador de feature flags (Issue #79).
 *
 * Verifica que cada chamada ao use case `AvaliarFeatureFlagsUseCase`
 * (que orquestra `FeatureFlagEvaluator.evaluate(...)` + contagem
 * Prometheus) emite exatamente uma entrada na métrica
 * `feature_flag_evaluations_total{flag_key, scope, hit}` por flag
 * avaliada, no formato esperado pelo exposition Prometheus.
 *
 * Convenção pt-BR: comentários e descrições em português.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { FeatureFlagEvaluator } from '../../../../application/admin/feature-flags/services/FeatureFlagEvaluator';
import {
  AvaliarFeatureFlagsUseCase,
  type AvaliarFeatureFlagsInput,
} from '../../../../application/admin/feature-flags/use-cases/AvaliarFeatureFlagsUseCase';

import { FeatureFlagMetrics } from './feature-flag.metrics';

function makeEvaluatorStub(
  impl: (key: string) => unknown = () => false
): Pick<FeatureFlagEvaluator, 'evaluate'> {
  return {
    evaluate: vi.fn(async (key: string) => impl(key)),
  };
}

describe('AvaliarFeatureFlagsUseCase — telemetry (Issue #79)', () => {
  let metrics: FeatureFlagMetrics;
  let evaluator: ReturnType<typeof makeEvaluatorStub>;
  let useCase: AvaliarFeatureFlagsUseCase;

  beforeEach(() => {
    metrics = new FeatureFlagMetrics();
    evaluator = makeEvaluatorStub((key) => (key === 'offline_enabled' ? true : false));
    useCase = new AvaliarFeatureFlagsUseCase(evaluator as unknown as FeatureFlagEvaluator, metrics);
  });

  function call(
    keys: string[],
    ctx: AvaliarFeatureFlagsInput['ctx'] = {}
  ): Promise<Record<string, unknown>> {
    return useCase.executar({ keys, ctx });
  }

  it('incrementa feature_flag_evaluations_total ao avaliar uma flag', async () => {
    await call(['offline_enabled']);

    const snap = metrics.snapshot();
    expect(snap.totalEvaluations).toBe(1);
    expect(snap.perFlag['offline_enabled']?.evaluations).toBe(1);
  });

  it('emite métrica 1x por avaliação em chamadas sucessivas (mesma flag)', async () => {
    await call(['offline_enabled']);
    await call(['offline_enabled']);

    const snap = metrics.snapshot();
    expect(snap.totalEvaluations).toBe(2);
    expect(snap.perFlag['offline_enabled']?.evaluations).toBe(2);
  });

  it('emite métrica com labels de scope corretos (RESTAURANT, USER, GLOBAL)', async () => {
    // RESTAURANT
    await call(['pix_enabled'], { restaurantId: 'rest-123' });
    // USER puro
    await call(['pix_enabled'], { userId: 'user-456' });
    // USER composto (restaurantId + userId) — classifica como USER
    await call(['pix_enabled'], {
      restaurantId: 'rest-123',
      userId: 'user-456',
    });
    // GLOBAL
    await call(['pix_enabled']);

    const out = metrics.render();
    expect(out).toContain('flag_key="pix_enabled"');
    expect(out).toMatch(/scope="RESTAURANT"/);
    expect(out).toMatch(/scope="USER"/);
    expect(out).toMatch(/scope="GLOBAL"/);
  });

  it('inclui label hit=true quando evaluator retorna valor truthy', async () => {
    await call(['offline_enabled']);

    const out = metrics.render();
    expect(out).toMatch(
      /feature_flag_evaluations_total\{flag_key="offline_enabled",scope="GLOBAL",hit="true"\} 1/
    );
  });

  it('inclui label hit=false quando evaluator retorna false', async () => {
    await call(['pix_enabled']);

    const out = metrics.render();
    expect(out).toMatch(
      /feature_flag_evaluations_total\{flag_key="pix_enabled",scope="GLOBAL",hit="false"\} 1/
    );
  });

  it('avalia todas as chaves do batch (N keys → N incrementos)', async () => {
    await call(['offline_enabled', 'pix_enabled']);

    expect(evaluator.evaluate).toHaveBeenCalledTimes(2);
    expect(metrics.snapshot().totalEvaluations).toBe(2);
  });

  it('isola falhas: chave que lança exceção não derruba batch e métrica só conta sucessos', async () => {
    evaluator = makeEvaluatorStub((key) => {
      if (key === 'pix_enabled') throw new Error('boom');
      return true;
    });
    useCase = new AvaliarFeatureFlagsUseCase(evaluator as unknown as FeatureFlagEvaluator, metrics);

    const result = await call(['offline_enabled', 'pix_enabled']);

    // O use case não derruba o batch — falha vira `false` para a chave
    // problemática e segue. Porém, a métrica só é incrementada após
    // sucesso (vide `AvaliarFeatureFlagsUseCase.executar`).
    expect(result.offline_enabled).toBe(true);
    expect(result.pix_enabled).toBe(false);
    const snap = metrics.snapshot();
    expect(snap.totalEvaluations).toBe(1);
    expect(snap.perFlag['offline_enabled']?.evaluations).toBe(1);
    expect(snap.perFlag['pix_enabled']).toBeUndefined();
  });

  it('renderiza métrica em formato Prometheus exposition válido', async () => {
    await call(['offline_enabled']);

    const out = metrics.render();
    // Cabeçalhos Prometheus esperados (vide design.md §6.1).
    expect(out).toContain('# HELP feature_flag_evaluations_total');
    expect(out).toContain('# TYPE feature_flag_evaluations_total counter');
  });
});
