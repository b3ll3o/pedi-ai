# Tasks — `feature-flags-runtime`

> Ordem de execução proposta. Cada fase é uma fatia entregável, validada independentemente.
> Cada item é verificável (teste, métrica ou evidência objetiva). S = ~3-5 dias, M = ~1-2 sprints, L = ~3+ sprints.
>
> **Tamanho total estimado:** M (~3-4 sprints para as 5 fases).

---

## [ ] Fase 1 — Foundation (S)

**Objetivo:** Criar a base de domínio + persistência + CRUD REST + cache + seed. **Nenhuma flag muda de comportamento em produção.**

### 1.1 Banco de dados

- [ ] Adicionar enums `FlagScope`, `FlagValueType` e models `FeatureFlag`, `FeatureFlagOverride`, `FeatureFlagAuditLog` em `apps/api/prisma/schema.prisma` (conforme `design.md §4`).
- [ ] Criar migration `prisma migrate dev --name add_feature_flags_runtime`.
- [ ] Validar que `prisma db push` aplica sem warning em dev e test (docker-compose).

### 1.2 Domínio (DDD)

- [ ] Criar `apps/api/src/domain/admin/feature-flags/entities/FeatureFlag.ts` com invariantes (`key` regex, `valueType` match com `defaultValue`).
- [ ] Criar value objects:
  - [ ] `FlagKey.ts` (valida `^[a-z0-9_]{3,64}$`).
  - [ ] `RolloutPercentage.ts` (inteiro 0-100).
  - [ ] `TargetingRule.ts` (combinação de `scope` + `scopeId`).
  - [ ] `FlagValue.ts` (wrapper tipado para `BOOLEAN|STRING|NUMBER|JSON`).
- [ ] Criar interface `IFeatureFlagRepository` em `apps/api/src/domain/admin/feature-flags/repositories/`.
- [ ] Criar domain event `FeatureFlagChanged` (imutável).

### 1.3 Aplicação (use cases)

- [ ] `ListarFeatureFlagsUseCase` (`@spec(RF-ADM-FF-01)`).
- [ ] `ObterFeatureFlagPorChaveUseCase` (`@spec(RF-ADM-FF-02)`).
- [ ] `CriarFeatureFlagUseCase` (`@spec(RF-ADM-FF-03)`) — audit log atômico.
- [ ] `AtualizarFeatureFlagUseCase` (`@spec(RF-ADM-FF-04)`).

### 1.4 Infraestrutura

- [ ] `PrismaFeatureFlagRepository` (implementa `IFeatureFlagRepository`).
- [ ] `FeatureFlagCache` (Redis com prefixo `ff:`, TTL 60s, fallback LRU in-process 1000 chaves).
- [ ] `FeatureFlagAuditLogger` (transação Prisma atômica).

### 1.5 Apresentação (REST)

- [ ] `FeatureFlagsController` (NestJS) com handlers `list`, `get`, `create`, `update` (RF-ADM-FF-01..04).
- [ ] DTOs Zod em `apps/api/src/presentation/admin/feature-flags/dto/`.
- [ ] Guard de papel (`owner` para mutação, `owner|manager` para leitura) alinhado a `RNF-SEC-FF-01`.
- [ ] Registrar módulo em `app.module.ts` sob path `/api/v1/admin/feature-flags`.

### 1.6 Seed

- [ ] `apps/api/prisma/seed-feature-flags.ts` com as 8 flags (`offline_enabled`, `pix_enabled`, `waiter_mode_enabled`, `qr_code_enabled`, `combos_enabled`, `analytics_enabled`, `cashback_enabled`, `multi_restaurant_enabled`).
- [ ] `defaultValue` derivado do env-var legado (vide `design.md §7`).
- [ ] Adicionar chamada no `db:seed` script.

### 1.7 Testes

- [ ] Unitários por use case (`vitest`, `coverage ≥ 80%` no módulo).
- [ ] E2E: `admin/feature-flags/{list,get,create,update}.spec.ts`.
- [ ] E2E RBAC: `admin/feature-flags/rbac.spec.ts` (manager → 403 em mutação).
- [ ] `pnpm validate:quick` verde.

### Critério de Pronto da Fase 1

- 4 endpoints REST funcionando localmente com DB.
- 8 flags seeded.
- Cache Redis funcional + fallback LRU testado.
- Nenhuma mudança de comportamento em produção.
- PR abrível e revisável (CI verde, RTM parcial gerada).

---

## [ ] Fase 2 — Targeting & Avaliação (M)

**Objetivo:** Permitir overrides por escopo + `FeatureFlagEvaluator` com precedência + rollout %.

### 2.1 Use cases adicionais

- [ ] `AdicionarOverrideUseCase` (`@spec(RF-ADM-FF-05)`).
- [ ] `RemoverOverrideUseCase` (`@spec(RF-ADM-FF-06)`).
- [ ] `ListarOverridesUseCase` (`@spec(RF-ADM-FF-07)`).
- [ ] `ListarAuditLogUseCase` (`@spec(RF-ADM-FF-09)`).
- [ ] `AvaliarFeatureFlagUseCase` (`@spec(RF-ADM-FF-08)`).

### 2.2 Avaliador puro

- [ ] `FeatureFlagEvaluator` em `apps/api/src/application/admin/feature-flags/FeatureFlagEvaluator.ts` (sem dependência de framework).
- [ ] Implementar ordem de precedência exata de `design.md §6.1`.
- [ ] Implementar `passesRollout` com `FNV-1a 64-bit` determinístico (pacote já presente em `@pedi-ai/shared` ou inline com fallback).
- [ ] Unitários com `describe.each` cobrindo todas as combinações de escopo × rollout × expiração.

### 2.3 Endpoints REST

- [ ] `POST /:key/overrides` (`@spec(RF-ADM-FF-05)`).
- [ ] `DELETE /:key/overrides/:id` (`@spec(RF-ADM-FF-06)`).
- [ ] `GET /:key/overrides` (`@spec(RF-ADM-FF-07)`).
- [ ] `GET /:key/audit` (`@spec(RF-ADM-FF-09)`).
- [ ] `GET /evaluate` (`@spec(RF-ADM-FF-08)`) — público + rate limit (`@nestjs/throttler`, 100/min/IP).
- [ ] Validações Zod (`OverrideScopeSchema`, `CreateOverrideDtoSchema`, `EvalQuerySchema`).
- [ ] Invalidação de cache em toda mutação (delete Redis key + LRU evict).

### 2.4 Cenários BDD

- [ ] `features/admin/feature-flags/avaliar.feature` com os 5 cenários de `design.md §9`.
- [ ] `features/admin/feature-flags/overrides.feature` com os 4 cenários.

### 2.5 Testes E2E

- [ ] `admin/feature-flags/overrides.spec.ts`.
- [ ] `admin/feature-flags/evaluate.spec.ts` — incluindo cenário com DB desligado (validar `RNF-AVAIL-FF-01`).

### Critério de Pronto da Fase 2

- Owner consegue criar override RESTAURANT e mudar comportamento da flag para 1 restaurante específico via API.
- Rollout % determinístico verificado por 1000 iterações (teste estatístico).
- Fallback env-var verificado com Postgres e Redis desligados em docker-compose.

---

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
