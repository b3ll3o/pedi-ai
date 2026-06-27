# Feature Flags — Guia Operacional

> Sistema de feature flags runtime, DB-backed, com overrides por escopo e
> propagação por polling. Hospedado no BC `admin`.

**Requisitos cobertos:** `RF-ADM-FF-01..10` + `RNF-PERF-FF-01`, `RNF-AVAIL-FF-01`,
`RNF-SEC-FF-01`, `RNF-I18N-FF-01`, `RNF-MAINT-FF-01`, `RNF-RELI-FF-01`.

---

## 1. Para o Owner / Manager

Acesse `/admin/feature-flags`. Você pode:

- Listar, criar, ativar/desativar e editar flags (`RF-ADM-FF-01..04`).
- Adicionar e remover overrides por escopo `GLOBAL` / `RESTAURANT` / `USER`
  (`RF-ADM-FF-05..06`).
- Visualizar o audit log de cada flag (`RF-ADM-FF-09`).

**Atenção:**

- Propagação para o front leva **até 30 segundos** (polling).
- Apenas `owner` pode mutar. `manager` apenas lê e consulta audit
  (`RNF-SEC-FF-01`).
- Endpoint `/evaluate` é público mas rate-limited em **100 req/min/IP**
  (`@nestjs/throttler`).

## 2. Como adicionar uma nova flag

1. A flag é persistida no Postgres (model `feature_flags` em
   `apps/api/prisma/schema.prisma`).
2. Padrão de chave: `snake_case`, ASCII `[a-z0-9_]{3,64}`. Veja validação
   em `packages/feature-flags/src/schema.ts`.
3. `valueType` ∈ {`BOOLEAN`, `STRING`, `NUMBER`, `JSON`}; `defaultValue`
   deve ser compatível (validado por Zod).
4. Se a flag substitui um env-var legado, mantenha o env-var por compat:
   `apps/web/src/lib/feature-flags.ts` cai nele quando o SDK está fora.
5. Adicione `@spec(RF-ADM-FF-NN)` no use case correspondente em
   `apps/api/src/application/admin/feature-flags/`.
6. Atualize este guia e a RTM (`pnpm rtm`).

## 3. Precedência de avaliação

Para cada chave, na ordem:

1. `USER(scopeId = "<restaurantId>:<userId>")` — override mais específico
2. `RESTAURANT(scopeId = restaurantId)` — override por tenant
3. `USER(scopeId = userId)` — override por usuário global
4. `GLOBAL` — override global sem escopo
5. `defaultValue` — fallback final

`enabled = false` curto-circuita a cadeia e retorna `defaultValue`.

## 4. Rollout percentual

- Determinístico por `FNV-1a(64)(flagId + ":" + subjectId) % 100`.
- `rolloutPct = 100` (ou ausente) → override sempre aplicado.
- `rolloutPct = 0` → override nunca aplicado (cai para próxima regra).
- Para `0 < rolloutPct < 100`, a decisão é estável por `(flagId, userId)`.

## 5. Cache e fallback

- **L1 (Redis):** prefixo `ff:`, TTL 60 s. Invalidação em toda mutação.
- **L2 (LRU in-process):** 1000 chaves, TTL 60 s. Fallback se Redis cair.
- **Fallback final:** se DB e L2 falharem, retorna `defaultValue`; no front,
  `apps/web/src/lib/feature-flags.ts` cai para env-var legado
  (`RNF-AVAIL-FF-01`).
- Latência alvo: **p99 < 5 ms** (cache hit) e **< 50 ms** (cache miss) —
  `RNF-PERF-FF-01`.

## 6. RBAC

| Papel | Listar/Obter | Criar/Editar | Ver audit |
| --- | --- | --- | --- |
| `owner` | ✅ | ✅ | ✅ |
| `manager` | ✅ | ❌ | ✅ |
| `staff` | ❌ | ❌ | ❌ |

Guard: `apps/api/src/presentation/admin/feature-flags/guards/FeatureFlagAdminGuard.ts`.
Todas as mutações exigem `owner`; leitura e audit aceitam `owner | manager`.

## 7. Para o dev (consumindo a flag)

### Frontend (Next.js + React)

```tsx
import { useFeatureFlag } from '@/infrastructure/feature-flags';

const pixHabilitado = useFeatureFlag<boolean>('pix_enabled', false);
```

O `FeatureFlagProvider` (React context) faz polling de 30 s no endpoint
`/api/v1/admin/feature-flags/evaluate` e propaga o resultado para todos os
hooks `useFeatureFlag` da árvore.

### Backend (NestJS)

```ts
import { FeatureFlagClient } from '@pedi-ai/feature-flags';

const habilitado = await client.isEnabled('pix_enabled', {
  restaurantId,
  userId,
});
```

`FeatureFlagClient` chama o endpoint público `/evaluate` com cache local.

## 8. Audit log

Cada mutação em flag ou override gera entrada imutável em
`feature_flag_audit_logs` na mesma transação Prisma (`RNF-RELI-FF-01`).
Ações registradas: `CREATE`, `UPDATE`, `TOGGLE`, `OVERRIDE_ADD`,
`OVERRIDE_REMOVE`, `ROLLOUT_CHANGE`.

Acesse via UI (`/admin/feature-flags` → aba audit) ou
`GET /api/v1/admin/feature-flags/:key/audit`.

## 9. Métricas Prometheus

- `feature_flag_evaluations_total{key, scope, hit}` — counter.
- `feature_flag_cache_hits_total{layer}` — counter (`layer` ∈ {`redis`,
  `lru`, `miss`}).
- `feature_flag_fallback_total{reason}` — counter (`reason` ∈ {`db_down`,
  `redis_down`, `timeout`, `schema_error`}).
- `feature_flag_evaluate_duration_seconds` — histogram (buckets
  `[0.001, 0.005, 0.01, 0.05, 0.1, 0.5]`).

Endpoint: `GET /metrics` (Prometheus padrão).

## 10. Referências

- Mudança original (histórico): `.openspec/changes/feature-flags-runtime/`
- Baseline: `.openspec/specs/admin/design.md §2.1`
- Schema: `apps/api/prisma/schema.prisma` (models `FeatureFlag`,
  `FeatureFlagOverride`, `FeatureFlagAuditLog`)
- SDK compartilhado: `packages/feature-flags/`
- Plano de testes: `docs/qa/feature-flags-test-plan.md`
- Decisão BDD: `docs/qa/bdd-runner-decision.md`
