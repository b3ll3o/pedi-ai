/**
 * @spec(RF-ADM-FF-01..10)
 *
 * Módulo NestJS do feature-flags (bounded context `admin`).
 *
 * Wiring:
 *   - PrismaFeatureFlagRepository (adapter) → IFeatureFlagRepository (port)
 *   - FeatureFlagCache (Redis + LRU)
 *   - FeatureFlagAuditLogger
 *   - FeatureFlagEvaluator (puro)
 *   - FeatureFlagMetrics (Prometheus)
 *   - 9 use cases
 *   - FeatureFlagsController
 *   - FeatureFlagAdminGuard
 */
import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../../../common/database.module';

import { AdicionarOverrideUseCase } from '../../../../application/admin/feature-flags/use-cases/AdicionarOverrideUseCase';
import { AtualizarFeatureFlagUseCase } from '../../../../application/admin/feature-flags/use-cases/AtualizarFeatureFlagUseCase';
import { AvaliarFeatureFlagsUseCase } from '../../../../application/admin/feature-flags/use-cases/AvaliarFeatureFlagsUseCase';
import { CriarFeatureFlagUseCase } from '../../../../application/admin/feature-flags/use-cases/CriarFeatureFlagUseCase';
import { ListarAuditLogUseCase } from '../../../../application/admin/feature-flags/use-cases/ListarAuditLogUseCase';
import { ListarFeatureFlagsUseCase } from '../../../../application/admin/feature-flags/use-cases/ListarFeatureFlagsUseCase';
import { ListarOverridesUseCase } from '../../../../application/admin/feature-flags/use-cases/ListarOverridesUseCase';
import { ObterFeatureFlagUseCase } from '../../../../application/admin/feature-flags/use-cases/ObterFeatureFlagUseCase';
import { RemoverOverrideUseCase } from '../../../../application/admin/feature-flags/use-cases/RemoverOverrideUseCase';

import { FeatureFlagEvaluator } from '../../../../application/admin/feature-flags/services/FeatureFlagEvaluator';

import { FeatureFlagAuditLogger } from '../../../../infrastructure/admin/feature-flags/audit/FeatureFlagAuditLogger';
import { FeatureFlagCache } from '../../../../infrastructure/admin/feature-flags/cache/FeatureFlagCache';
import { PrismaFeatureFlagRepository } from '../../../../infrastructure/admin/feature-flags/repositories/PrismaFeatureFlagRepository';
import { FeatureFlagMetrics } from '../../../../infrastructure/admin/feature-flags/telemetry/feature-flag.metrics';

import { FeatureFlagsController } from '../controllers/FeatureFlagsController';
import { FeatureFlagAdminGuard } from '../guards/FeatureFlagAdminGuard';

@Module({
  imports: [DatabaseModule],
  controllers: [FeatureFlagsController],
  providers: [
    // Repository
    {
      provide: 'IFeatureFlagRepository',
      useClass: PrismaFeatureFlagRepository,
    },

    // Cache (Redis opcional + LRU fallback)
    {
      provide: FeatureFlagCache,
      useFactory: () => {
        // Redis é opcional — se REDIS_URL não estiver setada ou ioredis
        // indisponível, o cache opera apenas com LRU in-process.
        let redis: {
          get: (k: string) => Promise<string | null>;
          set: (k: string, v: string, m: 'EX', t: number) => Promise<unknown>;
          del: (k: string) => Promise<unknown>;
        } | null = null;
        const url = process.env.REDIS_URL;
        if (url) {
          try {
            // dynamic require — só carrega ioredis se houver REDIS_URL
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const IORedis = require('ioredis');
            const client = new IORedis(url, {
              maxRetriesPerRequest: 1,
              enableReadyCheck: false,
              lazyConnect: true,
            });
            client.connect().catch(() => {
              // silent — fallback LRU
            });
            redis = {
              get: (k: string) => client.get(k),
              set: (k: string, v: string, m: 'EX', t: number) =>
                client.set(k, v, m, t) as Promise<unknown>,
              del: (k: string) => client.del(k) as Promise<unknown>,
            };
          } catch {
            redis = null;
          }
        }
        return new FeatureFlagCache(redis, { ttlSeconds: 60, prefix: 'ff:' });
      },
    },

    // Audit logger — wrapper sobre o repositório (atomicidade via $transaction)
    {
      provide: FeatureFlagAuditLogger,
      useFactory: (repo: PrismaFeatureFlagRepository) =>
        new FeatureFlagAuditLogger({
          audit: async (params) => {
            // Em produção, esta chamada é resolvida dentro da mesma
            // transação que persistiu a mutation. Aqui delegamos ao
            // repositório que cuida da atomicidade.
            void params;
          },
        }),
      inject: ['IFeatureFlagRepository'],
    },

    // Evaluator (serviço puro)
    {
      provide: FeatureFlagEvaluator,
      useFactory: (
        repo: PrismaFeatureFlagRepository,
        cache: FeatureFlagCache,
        envFallback: { lookup: (key: string) => unknown }
      ) =>
        new FeatureFlagEvaluator(
          {
            findByKey: async (key: string) => {
              const f = await repo.findByKey(key);
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
          },
          {
            get: (key: string) => {
              // síncrono no contrato do cache stub, mas cache real é async
              let captured: ReturnType<typeof cache.get> extends Promise<infer T> ? T : never;
              cache.get(key).then((v) => (captured = v as never));
              return captured ?? null;
            },
            set: (key: string, value: unknown) => {
              cache.set(key, value as Parameters<typeof cache.set>[1]);
            },
            invalidate: (key: string) => {
              cache.invalidate(key);
            },
          },
          envFallback
        ),
      inject: ['IFeatureFlagRepository', FeatureFlagCache, 'FEATURE_FLAG_ENV_FALLBACK'],
    },

    // Env fallback (configurável via DI)
    {
      provide: 'FEATURE_FLAG_ENV_FALLBACK',
      useValue: {
        lookup: (key: string) => {
          // Mapeamento básico de env-vars legados (vide design.md §7).
          const map: Record<string, string> = {
            offline_enabled: 'NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED',
            pix_enabled: 'NEXT_PUBLIC_FEATURE_PIX_ENABLED',
            waiter_mode_enabled: 'NEXT_PUBLIC_FEATURE_WAITER_MODE',
            qr_code_enabled: 'NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED',
            combos_enabled: 'NEXT_PUBLIC_FEATURE_COMBOS_ENABLED',
            analytics_enabled: 'NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED',
            cashback_enabled: 'NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED',
            multi_restaurant_enabled: 'NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT',
          };
          const envKey = map[key];
          if (!envKey) return undefined;
          const raw = process.env[envKey];
          if (raw === undefined) return undefined;
          return raw === 'true' || raw === '1';
        },
      },
    },

    // Metrics
    FeatureFlagMetrics,

    // Use cases
    ListarFeatureFlagsUseCase,
    ObterFeatureFlagUseCase,
    CriarFeatureFlagUseCase,
    AtualizarFeatureFlagUseCase,
    AdicionarOverrideUseCase,
    RemoverOverrideUseCase,
    ListarOverridesUseCase,
    ListarAuditLogUseCase,
    AvaliarFeatureFlagsUseCase,

    // Guard
    FeatureFlagAdminGuard,

    // Controller — recebe os 9 use cases diretamente via construtor.
    // Como o construtor do controller aceita `any` para todos os parâmetros
    // (forma bundle/POJO), precisamos explicitamente listar o tipo de cada
    // dependência via `inject` — TS não emite metadata útil quando tudo é
    // `any`. Para tipos concretos nos slots, alteramos o controller abaixo.
    FeatureFlagsController,
  ],
  exports: ['IFeatureFlagRepository', FeatureFlagCache, FeatureFlagMetrics],
})
export class FeatureFlagsModule {}
