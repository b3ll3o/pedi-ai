# Proposal — Feature Flags Web SDK + Phase 3-5

> **Slug:** `feature-flags-web-sdk` · **Status:** 🟡 Em planejamento · **Owner:** Time Admin · **Data:** 2026-07-29
> **BC origem:** [`feature-flags-runtime`](../archive/2026-Q3/feature-flags-runtime/) (arquivado em 2026-07-29 após merge de Fase 1+2 no PR [#57](https://github.com/b3ll3o/pedi-ai/pull/57))
> **BC destino:** mesmo contexto (`admin`) · cross-cutting front-end `apps/web/src/infrastructure/feature-flags/`

## Contexto

O agregado `FeatureFlag` já está implementado no backend (Phase 1+2 do change arquivado [`feature-flags-runtime`](../archive/2026-Q3/feature-flags-runtime/)):

- 10 endpoints REST (`/api/v1/admin/feature-flags/*`) com RBAC por papel
- `FeatureFlagEvaluator` puro com precedência GLOBAL/RESTAURANT/USER + rollout % determinístico (FNV-1a 64-bit)
- `FeatureFlagCache` com Redis (TTL 60s) + fallback LRU in-process 1000 chaves
- `FeatureFlagAuditLogger` com transação Prisma atômica + asserções LGPD
- Seed com 8 flags alinhadas a `apps/web/src/lib/feature-flags.ts` (compat layer)

Falta o **lado cliente** (SDK tipado + polling + hook React) e a **observabilidade** do consumo.

## Escopo desta change

Fases 3, 4 e 5 do change original (com renumeração respeitando progresso já feito):

### Fase 3 — SDK Cliente (M)

- Pacote `@pedi-ai/feature-flags` em `packages/feature-flags/` (Zod schemas únicos, tipos compartilhados).
- `FeatureFlagClient` (server-side, via HTTP `/evaluate` interno).
- `FeatureFlagClient` (client-side, polling 30s).
- `FeatureFlagProvider.tsx` + `useFeatureFlag(key, fallback)` tipado.
- Compat layer preservando `apps/web/src/lib/feature-flags.ts` (11 callers atuais).
- Documentação `docs/guides/FEATURE_FLAGS.md`.

### Fase 4 — UI Admin (M)

- Painel `/admin/feature-flags`:
  - Listagem + busca + filtros por escopo.
  - Modal de edição com diff high-level (default → override).
  - Drag-and-drop para reordenar rollout %.
- Hooks: `useListFeatureFlags`, `useCreateFeatureFlag`, `useAddOverride`, `useRemoveOverride`.
- Auto-nova visão de audit log (`/audit`) com paginação.

### Fase 5 — Observabilidade (S)

- Métricas Prometheus:
  - `feature_flag_evaluation_total{key,scope,outcome}` counter
  - `feature_flag_evaluation_duration_seconds{key}` histogram (RNF-PERF-FF-01: p99 < 5ms cache hit, < 50ms cache miss)
- Audit log accessível via `/api/v1/admin/feature-flags/:key/audit`.
- Tracing OTEL: span `feature_flag.evaluate` com `key`, `scope`, `outcome`.

## RFs/RNFs já especificados no change arquivado

Fase 3 cobre: RF-ADM-FF-11 (hook `useFeatureFlag`), RF-ADM-FF-12 (Provider com polling), RF-ADM-FF-13 (`/evaluate` rate-limit), RNF-AVAIL-FF-01 (fallback env-var), RNF-PERF-FF-01 (p99 < 5ms cache hit).

Fase 4 adiciona: RF-ADM-FF-14 (UI listagem), RF-ADM-FF-15 (UI edição), RF-ADM-FF-16 (drag-and-drop rollout).

Fase 5 adiciona: RF-ADM-FF-17 (métricas), RF-ADM-FF-18 (audit API), RNF-OBS-FF-01 (tracing).

> **Specs completos em:** `.openspec/archive/2026-Q3/feature-flags-runtime/specs/RF-ADM-FF-{01..10}.md` e `RNF-*-FF-{01..05}.md`. Esta change referencia e estende — não duplica.

## Decisões a confirmar

1. **Onde mora o pacote compartilhado?** `packages/feature-flags/` (proposto) vs `packages/shared/feature-flags/`. Trade-off: pacote dedicado isola publicação/release; compartilhado reduz boilerplate.
2. **Polling fallback:** 30s default (proposto) vs configurável por flag. Trade-off: simplicidade vs flexibilidade.
3. **Provider scope:** global no `RootLayout` (proposto) vs opt-in por rota. Trade-off: zero-config vs tamanho de bundle.

## Backlog (não nesta change)

- Multi-restaurante frontend (RF-ADM-09, planejado).
- Cashback frontend (RF planejado).
- Auto-rollout (a/b testing integrado).

---

🤖 Gerado a partir de [`feature-flags-runtime/`](../archive/2026-Q3/feature-flags-runtime/) — ver `tasks.md` para detalhamento das fases 3-5.
