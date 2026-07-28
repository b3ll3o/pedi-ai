/**
 * @spec(RF-ADM-FF-08, RNF-PERF-FF-01, RNF-AVAIL-FF-01)
 *
 * Use case `AvaliarFeatureFlagsUseCase` — avalia em batch N chaves e
 * retorna um mapa `key → resolvedValue`.
 *
 * Limites:
 *   - Máximo 32 chaves por request
 *   - Em caso de erro, retorna `false` para a chave (graceful degradation)
 *
 * Métricas: incrementa `feature_flag_evaluations_total{key, scope, hit}` por chave.
 */
import { BadRequestException, Injectable } from '@nestjs/common';

import { FeatureFlagEvaluator, EvalContext } from '../services/FeatureFlagEvaluator';
import { FeatureFlagMetrics } from '../../../../infrastructure/admin/feature-flags/telemetry/feature-flag.metrics';

export interface AvaliarFeatureFlagsInput {
  keys: string[];
  ctx: EvalContext;
}

const MAX_KEYS = 32;

@Injectable()
export class AvaliarFeatureFlagsUseCase {
  constructor(
    private readonly evaluator: FeatureFlagEvaluator,
    private readonly metrics: FeatureFlagMetrics
  ) {}

  async executar(input: AvaliarFeatureFlagsInput): Promise<Record<string, unknown>> {
    if (!input.keys || input.keys.length === 0) {
      throw new BadRequestException('Pelo menos uma key deve ser informada');
    }
    if (input.keys.length > MAX_KEYS) {
      throw new BadRequestException(
        `Batch excede o limite máximo de ${MAX_KEYS} itens (recebido: ${input.keys.length})`
      );
    }

    const result: Record<string, unknown> = {};

    for (const key of input.keys) {
      try {
        const value = await this.evaluator.evaluate(key, input.ctx);
        result[key] = value;

        // Determina scope (mais específico que casou) — heurística simples
        const scope =
          input.ctx.restaurantId && input.ctx.userId
            ? 'USER'
            : input.ctx.restaurantId
              ? 'RESTAURANT'
              : input.ctx.userId
                ? 'USER'
                : 'GLOBAL';

        this.metrics.incrementEvaluation({
          key,
          scope,
          hit: value !== false,
        });
      } catch (err) {
        // Falha isolada por chave — não derruba o batch.
        result[key] = false;
        void err;
      }
    }

    return result;
  }
}
