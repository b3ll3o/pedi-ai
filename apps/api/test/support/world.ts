/**
 * World BDD — contexto compartilhado entre steps de um cenário.
 *
 * Cada cenário recebe um World novo (default do cucumber-js). Aqui
 * instanciamos o repo em memória, o cache LRU, o env-fallback stub, o
 * evaluator e o controller, e os expomos aos steps via `this`.
 */
import {
  FeatureFlagEvaluator,
  type EvalContext,
} from '../../src/application/admin/feature-flags/services/FeatureFlagEvaluator';
import { FeatureFlagsController } from '../../src/presentation/admin/feature-flags/controllers/FeatureFlagsController';
import { FeatureFlagAdminGuard } from '../../src/presentation/admin/feature-flags/guards/FeatureFlagAdminGuard';
import { AdicionarOverrideUseCase } from '../../src/application/admin/feature-flags/use-cases/AdicionarOverrideUseCase';
import { AtualizarFeatureFlagUseCase } from '../../src/application/admin/feature-flags/use-cases/AtualizarFeatureFlagUseCase';
import { AvaliarFeatureFlagsUseCase } from '../../src/application/admin/feature-flags/use-cases/AvaliarFeatureFlagsUseCase';
import { CriarFeatureFlagUseCase } from '../../src/application/admin/feature-flags/use-cases/CriarFeatureFlagUseCase';
import { ListarAuditLogUseCase } from '../../src/application/admin/feature-flags/use-cases/ListarAuditLogUseCase';
import { ListarFeatureFlagsUseCase } from '../../src/application/admin/feature-flags/use-cases/ListarFeatureFlagsUseCase';
import { ListarOverridesUseCase } from '../../src/application/admin/feature-flags/use-cases/ListarOverridesUseCase';
import { ObterFeatureFlagUseCase } from '../../src/application/admin/feature-flags/use-cases/ObterFeatureFlagUseCase';
import { RemoverOverrideUseCase } from '../../src/application/admin/feature-flags/use-cases/RemoverOverrideUseCase';
import { FeatureFlagAuditLogger } from '../../src/infrastructure/admin/feature-flags/audit/FeatureFlagAuditLogger';

import { LruStubCache } from './lru-cache';
import { MemFeatureFlagRepository } from './mem-repo';
import { FeatureFlagMetricsStub } from './metrics-stub';

export interface RequestLike {
  method: string;
  user?: { sub: string; role?: string };
  handlerName?: string;
}

export interface ApiResponse<T = unknown> {
  status: number;
  body: T;
  /** headers como objeto simples (ex.: cache-control) */
  headers?: Record<string, string>;
}

const ENV_VAR_MAP: Record<string, string> = {
  offline_enabled: 'NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED',
  pix_enabled: 'NEXT_PUBLIC_FEATURE_PIX_ENABLED',
  waiter_mode_enabled: 'NEXT_PUBLIC_FEATURE_WAITER_MODE',
  qr_code_enabled: 'NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED',
  combos_enabled: 'NEXT_PUBLIC_FEATURE_COMBOS_ENABLED',
  analytics_enabled: 'NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED',
  cashback_enabled: 'NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED',
  multi_restaurant_enabled: 'NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT',
};

export class FeatureFlagsWorld {
  repo = new MemFeatureFlagRepository();
  cache = new LruStubCache();
  metrics = new FeatureFlagMetricsStub();
  auditLogger!: FeatureFlagAuditLogger;
  evaluator!: FeatureFlagEvaluator;
  controller!: FeatureFlagsController;
  guard = new FeatureFlagAdminGuard();

  /** contexto de avaliação atual */
  evalCtx: EvalContext = {};
  /** role do "usuário logado" para o cenário */
  authRole: 'owner' | 'manager' | 'staff' | null = null;
  authUserId: string | null = null;

  /** última resposta da API simulada */
  lastResponse: ApiResponse | null = null;
  /** último resultado direto do evaluator */
  lastEvalResult: unknown = undefined;

  /** contadores para asserts estatísticos */
  p99Samples: number[] = [];

  /** env-fallback stub (configurável) */
  envFallback = {
    lookup: (key: string): unknown => {
      const envKey = ENV_VAR_MAP[key];
      if (!envKey) return undefined;
      const raw = process.env[envKey];
      if (raw === undefined) return undefined;
      return raw === 'true' || raw === '1';
    },
  };

  constructor() {
    this.repo.seedLegadas();
    this.wire();
  }

  /** conecta evaluator + use cases + controller usando stubs em memória */
  private wire(): void {
    // repo wrapper para o evaluator (findByKey → CacheableFlagSnapshot)
    const repoAdapter = {
      findByKey: async (key: string) => {
        const f = await this.repo.findByKey(key);
        if (!f) return null;
        return {
          id: f.id,
          key: f.key,
          enabled: f.enabled,
          defaultValue: f.defaultValue,
          valueType: f.valueType,
          overrides: f.overrides.map((o) => ({
            id: o.id,
            scope: o.scope,
            scopeId: o.scopeId,
            value: o.value,
            rolloutPct: o.rolloutPct,
            expiresAt: o.expiresAt,
          })),
        };
      },
    };

    this.auditLogger = new FeatureFlagAuditLogger({
      audit: async () => {
        // audit já é gravado pelo repo (transacional). Este wrapper existe
        // para satisfazer o contrato do AuditLogger — sem efeito colateral
        // extra em memória.
      },
    });

    this.evaluator = new FeatureFlagEvaluator(repoAdapter, this.cache, this.envFallback);

    const listarUC = new ListarFeatureFlagsUseCase(this.repo);
    const obterUC = new ObterFeatureFlagUseCase(this.repo);
    const criarUC = new CriarFeatureFlagUseCase(this.repo, this.auditLogger);
    const atualizarUC = new AtualizarFeatureFlagUseCase(this.repo, this.cache, this.auditLogger);
    const adicionarOverrideUC = new AdicionarOverrideUseCase(
      this.repo,
      this.cache,
      this.auditLogger
    );
    const removerOverrideUC = new RemoverOverrideUseCase(this.repo, this.cache, this.auditLogger);
    const listarOverridesUC = new ListarOverridesUseCase(this.repo);
    const listarAuditUC = new ListarAuditLogUseCase(this.repo);
    const avaliarUC = new AvaliarFeatureFlagsUseCase(this.evaluator, this.metrics as never);

    this.controller = new FeatureFlagsController(
      listarUC,
      obterUC,
      criarUC,
      atualizarUC,
      adicionarOverrideUC,
      removerOverrideUC,
      listarOverridesUC,
      listarAuditUC,
      avaliarUC
    );
  }

  /** reseta estado entre cenários */
  reset(): void {
    this.repo.reset();
    this.repo.seedLegadas();
    this.cache.reset();
    this.metrics.reset();
    this.evalCtx = {};
    this.authRole = null;
    this.authUserId = null;
    this.lastResponse = null;
    this.lastEvalResult = undefined;
    this.p99Samples = [];
  }

  /** monta request simulado a partir do role atual */
  buildRequest(method: string, handlerName?: string): RequestLike {
    const req: RequestLike = { method: method.toUpperCase() };
    if (this.authRole) {
      req.user = { sub: this.authUserId ?? `user_${this.authRole}`, role: this.authRole };
    }
    if (handlerName) req.handlerName = handlerName;
    return req;
  }

  /** executa o controller com o guard aplicado */
  async callController<T = unknown>(
    handler: keyof FeatureFlagsController,
    args: unknown[],
    method?: string
  ): Promise<ApiResponse<T>> {
    const handlerName = String(handler);
    const req = this.buildRequest(method, handlerName);

    // Aplica guard manualmente (exceto 'avaliar' que é público)
    if (handlerName !== 'avaliar') {
      try {
        const ok = this.guard.canActivate({
          switchToHttp: () => ({ getRequest: () => req }),
          getHandler: () => ({ name: handlerName }),
        } as never);
        if (!ok) {
          return { status: 403, body: { message: 'Acesso negado' } as T };
        }
      } catch (err) {
        const e = err as Error & { status?: number; message?: unknown };
        const status = e.status ?? 401;
        const message = typeof e.message === 'string' ? e.message : 'Erro de autorização';
        return { status, body: { message } as T };
      }
    }

    // const req = this.buildRequest(method, handlerName);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = (this.controller as any)[handler];
      if (typeof fn !== 'function') {
        return { status: 500, body: { message: `handler '${handlerName}' não existe` } as T };
      }
      const result = await fn.call(this.controller, req, ...args);

      // DELETE → 204 sem body
      if (method.toUpperCase() === 'DELETE' && result === undefined) {
        return { status: 204, body: undefined as T };
      }

      const status = method.toUpperCase() === 'POST' ? 201 : 200;
      return { status, body: result as T };
    } catch (err) {
      const e = err as Error & {
        status?: number;
        response?: { message?: unknown; body?: unknown };
      };
      const status = e.status ?? 500;
      const body = (e.response ?? { message: e.message ?? 'Erro interno' }) as T;
      return { status, body };
    }
  }

  /** expõe o handler `avaliar` para cenários públicos */
  async callAvaliar(query: Record<string, string>): Promise<ApiResponse> {
    return this.callController('avaliar', [query], 'GET');
  }
}
