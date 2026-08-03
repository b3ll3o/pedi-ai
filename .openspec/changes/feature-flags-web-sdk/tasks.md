# Tasks — `feature-flags-web-sdk`

> Fork do change arquivado [`feature-flags-runtime/`](../archive/2026-Q3/feature-flags-runtime/) — contém exclusivamente as **Fases 3, 4 e 5** (SDK cliente, UI admin e observabilidade).
>
> Phases 1 (Foundation) e 2 (Targeting & Avaliação) já foram aplicadas via PR #57 (`chore/auditoria-completa-2026-07-29`) em 2026-07-29 e estão com checkboxes `[x]` no `tasks.md` arquivado.

## [ ] Fase 3 — SDK Cliente (M)

**Objetivo:** Disponibilizar SDK tipado único para front e back, com polling 30s no front.

### 3.1 Pacote compartilhado

- [ ] Criar `packages/feature-flags/` com:
  - [ ] `package.json` (`name: "@pedi-ai/feature-flags"`, `main: dist/index.js`, `types: dist/index.d.ts`).
  - [ ] `src/schema.ts` (Zod schemas únicos, vide `design.md §5`).
  - [ ] `src/types.ts` (`FlagKey`, `EvalContext`, `ResolvedFlagMap`).
  - [ ] `src/index.ts` (exports públicos).
- [ ] Adicionar ao `pnpm-workspace.yaml` se necessário.
- [ ] Build via `tsc` para `dist/`.

### 3.2 Server-side SDK

- [ ] `FeatureFlagClient` (server) em `apps/api/src/infrastructure/feature-flags/FeatureFlagClient.ts` — usa `HttpClient` interno para chamar `/evaluate`.
- [ ] Wire em um local central (`AppModule` providers) para reuso em outros BCs.

### 3.3 Client-side SDK + Provider React

- [ ] `apps/web/src/infrastructure/feature-flags/FeatureFlagClient.ts` (polling 30s).
- [ ] `apps/web/src/infrastructure/feature-flags/FeatureFlagProvider.tsx` (React context).
- [ ] `apps/web/src/infrastructure/feature-flags/useFeatureFlag.ts` (hook tipado com fallback).
- [ ] Tipagem derivada de `packages/feature-flags/src/types.ts`.

### 3.4 Compat layer

- [ ] Reescrever `apps/web/src/lib/feature-flags.ts` para re-exportar de `@pedi-ai/feature-flags` mantendo mesma API pública (`isOfflineEnabled()`, etc.).
- [ ] Validar com `tsc --noEmit` que **nenhum** dos 11 callers atuais (`apps/web/src/application/admin/services/*UseCase.ts`) precisa de mudança.

### 3.5 Documentação

- [ ] Criar `docs/guides/FEATURE_FLAGS.md`:
  - Como o Owner/Manager usa o painel (referência F4).
  - Como adicionar uma nova flag (template + checklist).
  - Como o dev chama `useFeatureFlag(key, fallback)`.
  - Ordem de precedência (tabela).
  - Comportamento de fallback (RNF-AVAIL-FF-01).

### 3.6 Testes

- [ ] Unitários em `packages/feature-flags/` (`coverage ≥ 80%`).
- [ ] Test de integração: front chama `useFeatureFlag`, mocka fetch, valida polling 30s (fake timers).
- [ ] Test: compat shim mantém paridade de API (`isOfflineEnabled()` antes/depois retornam mesmo tipo).

### Critério de Pronto da Fase 3

- `useFeatureFlag('pix_enabled', false)` em um componente retorna o valor do DB.
- Polling 30s verificado (teste com fake timers + spy).
- 11 callers atuais continuam funcionando sem alteração.

---

## [ ] Fase 4 — UI Admin (M)

**Objetivo:** Painel completo em `/admin/feature-flags` para Owner e Manager.

### 4.1 Rota e layout

- [ ] `apps/web/src/app/admin/feature-flags/page.tsx` (Server Component, busca flags iniciais).
- [ ] `apps/web/src/app/admin/feature-flags/layout.tsx` com guard de papel (redirect se não owner/manager).
- [ ] Integrar com navegação admin existente.

### 4.2 Componentes

- [ ] `TabelaFeatureFlags.tsx` (`@spec(RF-ADM-FF-10)`):
  - Colunas: key, descrição, valueType, default, enabled, # overrides.
  - Toggle por linha (Pílula acessível, ARIA).
  - Estado de loading skeleton.
- [ ] `ModalOverrideFeatureFlag.tsx`:
  - Form com `scope`, `scopeId`, `value`, `rolloutPct`, `expiresAt`.
  - Validação client-side com Zod.
  - Confirmação destrutiva ao excluir.
- [ ] `AuditLogViewer.tsx`:
  - Lista últimos 50 eventos com timestamps relativos ("há 2 min").
  - Diff visual `before → after` em JSON formatado.
- [ ] `PainelFeatureFlags.tsx` (orquestrador) — combina os 3 acima + tabs.

### 4.3 Hooks e use cases client-side

- [ ] `useListarFeatureFlags.ts`.
- [ ] `useAtualizarFeatureFlag.ts` (com optimistic update + rollback em erro).
- [ ] `useAdicionarOverride.ts` / `useRemoverOverride.ts`.
- [ ] `useAuditLog.ts`.

### 4.4 Estados de UI

- [ ] Loading skeleton (shadcn/ui ou similar).
- [ ] Empty state ("Nenhuma flag cadastrada — comece criando uma").
- [ ] Error state (toast pt-BR + botão "Tentar novamente").
- [ ] Tooltip "Propagação pode levar até 30s" perto do toggle.

### 4.5 RBAC visual

- [ ] `manager` vê botões desabilitados (com tooltip "Apenas owner pode editar").
- [ ] Verificar com teste E2E.

### 4.6 Testes

- [ ] Componente: snapshot + interações (testing-library).
- [ ] E2E: `admin/feature-flags/ui.spec.ts` cobre os 2 cenários de `design.md §9`.
- [ ] Acessibilidade: axe-core em CI, zero violações graves.

### Critério de Pronto da Fase 4

- Owner consegue ligar `pix_enabled` via UI e ver a propagação para um restaurante específico em ≤ 30 s (verificado manualmente).
- Manager vê audit log mas não consegue editar (RBAC visual).
- Acessibilidade WCAG 2.1 AA nas páginas criadas.

---

## [ ] Fase 5 — Observabilidade (S)

**Objetivo:** Métricas Prometheus + queries de audit + dashboards Grafana.

### 5.1 Métricas

- [ ] `feature_flag_evaluations_total{key, scope, hit}` (counter).
- [ ] `feature_flag_cache_hits_total{layer}` (counter, `layer ∈ {redis, lru, miss}`).
- [ ] `feature_flag_fallback_total{reason}` (counter, `reason ∈ {db_down, redis_down, timeout, schema_error}`).
- [ ] `feature_flag_evaluate_duration_seconds` (histogram, buckets `[0.001, 0.005, 0.01, 0.05, 0.1, 0.5]`).
- [ ] Expor via `/metrics` (já instrumentado globalmente).

### 5.2 Tracing

- [ ] Span OpenTelemetry `feature_flag.evaluate` com atributos `key`, `cache_hit`, `latency_ms`.
- [ ] Já presente `http.request` envelopa este span.

### 5.3 Audit log — queries

- [ ] Endpoint interno `/admin/feature-flags/audit/search?actorId=...&action=...&since=...` (owner only) — opcional, sob demanda.
- [ ] Documentar queries úteis em `docs/guides/FEATURE_FLAGS.md`:
  - "Últimas 10 mudanças da flag X".
  - "Todas as ações do owner Y no mês".

### 5.4 Dashboard Grafana

- [ ] JSON do dashboard versionado em `infrastructure/grafana/dashboards/feature-flags.json`.
- [ ] Painéis: p99 latency, cache hit ratio, fallbacks por motivo, top 10 flags por avaliação, audit por ator.

### 5.5 Alertas (P2, não-bloqueante)

- [ ] Alerta `feature_flag_fallback_total > 10/5min` (possível DB down).
- [ ] Alerta `feature_flag_evaluate_duration_seconds:p99 > 50ms por 5min`.

### 5.6 Testes

- [ ] Unit: métrica incrementada corretamente em cada caminho do evaluator.
- [ ] Integration: scraping `/metrics` retorna as métricas esperadas (testcontainers).

### Critério de Pronto da Fase 5

- Dashboard Grafana disponível em staging.
- 2 alertas configurados em Prometheus (operação manual, fora do código).
- Runbook `docs/runbooks/FEATURE_FLAGS_INDISPONIVEIS.md` criado.

---

## Verificações Globais (executar antes de merge)

- [ ] `pnpm rtm` regenera RTM sem `Missing` para RF-ADM-FF-01..10.
- [ ] `pnpm validate:quick` verde (lint, typecheck, test, build).
- [ ] Cobertura ≥ 80% em todos os módulos novos.
- [ ] PR aprovado por **pelo menos** 1 mantenedor + CI verde (vide `.openspec/AGENTS.md §4`).
- [ ] Após merge, mover artefatos para `.openspec/specs/admin/feature-flags/` (ou fundir em `admin/design.md` consolidado, conforme decisão da equipe).

---

## Backlog de débitos técnicos aceitos (registrar para fase posterior)

- [ ] Particionar `feature_flag_audit_logs` por `createdAt` (trimestre) — quando volume justificar.
- [ ] Auto-refresh por WebSocket — se polling 30 s virar gargalo.
- [ ] Cache ETag no front para invalidação imediata após mutação admin.
- [ ] Documentar `next-translate` para pt-BR (hoje strings hardcoded em componentes).
