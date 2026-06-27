# Plano de Testes — Feature Flags Runtime

> Mudança: `.openspec/changes/feature-flags-runtime/`
> Status do plano: **Pronto para execução** — artefatos de teste criados; aguardando implementação pelo time backend/frontend (TDD estrito: RED → GREEN → REFACTOR).

---

## 1. Escopo

Cobrir 10 RFs + 6 RNFs do change `feature-flags-runtime`:

- **RF-ADM-FF-01..04** — CRUD de flags (F1 Foundation)
- **RF-ADM-FF-05..07** — Overrides (F2 Targeting)
- **RF-ADM-FF-08** — Avaliação / precedência / rollout (F2)
- **RF-ADM-FF-09** — Audit log (F2)
- **RF-ADM-FF-10** — UI painel admin (F4)
- **RNF-PERF-FF-01, RNF-AVAIL-FF-01, RNF-SEC-FF-01, RNF-I18N-FF-01, RNF-MAINT-FF-01, RNF-RELI-FF-01**

---

## 2. Matriz RF × Tipo de Teste

| RF / RNF         | BDD (Gherkin)                               | Unit (Vitest/Jest)                                                         | E2E (Playwright)                                       |
| ---------------- | ------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| RF-ADM-FF-01     | `gerenciar-flags.feature`                   | `listar.use-case.spec.ts`                                                  | `feature-flags.spec.ts` (admin/feature-flags listagem) |
| RF-ADM-FF-02     | `gerenciar-flags.feature`                   | `obter.use-case.spec.ts`                                                   | —                                                      |
| RF-ADM-FF-03     | `gerenciar-flags.feature`                   | `CriarFeatureFlagUseCase.spec.ts`                                          | `feature-flags.spec.ts` (toggle UI)                    |
| RF-ADM-FF-04     | `gerenciar-flags.feature`                   | `AtualizarFeatureFlagUseCase.spec.ts`                                      | `feature-flags.spec.ts` (toggle UI)                    |
| RF-ADM-FF-05     | `aplicar-overrides.feature`                 | `AdicionarOverrideUseCase.spec.ts`                                         | `feature-flags.spec.ts` (override RESTAURANT)          |
| RF-ADM-FF-06     | `aplicar-overrides.feature`                 | `RemoverOverrideUseCase.spec.ts`                                           | —                                                      |
| RF-ADM-FF-07     | `aplicar-overrides.feature`                 | `ListarOverridesUseCase.spec.ts`                                           | —                                                      |
| **RF-ADM-FF-08** | `avaliar-flags.feature`                     | **`FeatureFlagEvaluator.spec.ts`** ← TDD puro                              | `feature-flags.spec.ts` (propagação 30s)               |
| RF-ADM-FF-09     | `audit-log.feature`                         | `ListarAuditLogUseCase.spec.ts`                                            | `feature-flags.spec.ts` (audit visível)                |
| RF-ADM-FF-10     | `gerenciar-flags.feature`                   | `TabelaFeatureFlags.test.tsx`, `Modal…test.tsx`, `AuditLogViewer.test.tsx` | `feature-flags.spec.ts` (UI admin)                     |
| RNF-PERF-FF-01   | `avaliar-flags.feature` (cenário p99)       | `FeatureFlagCache.spec.ts` (TTL 60s)                                       | marcado `@slow` — opcional CI nightly                  |
| RNF-AVAIL-FF-01  | `avaliar-flags.feature` (fallback DB/Redis) | `FeatureFlagEvaluator.spec.ts` (fallback)                                  | marcado `@slow` — docker-compose DB down               |
| RNF-SEC-FF-01    | `rbac-admin.feature`                        | `FeatureFlagAdminGuard.spec.ts`                                            | `feature-flags.spec.ts` (manager 403)                  |
| RNF-I18N-FF-01   | implícito em todos                          | `TabelaFeatureFlags.test.tsx`, `Modal…test.tsx`                            | snapshot pt-BR em `feature-flags.spec.ts`              |
| RNF-MAINT-FF-01  | implícito                                   | type-checks (`tsc --noEmit`)                                               | —                                                      |
| RNF-RELI-FF-01   | `audit-log.feature` (atomicidade)           | `CriarFeatureFlagUseCase.spec.ts` (audit fail)                             | —                                                      |

---

## 3. Estratégia de Mocking

### 3.1 Backend (Vitest + NestJS)

| Camada                      | Estratégia                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| `domain/feature-flags/`     | **Zero mocks** — VOs e agregado testados com instâncias literais.                         |
| `application/evaluator`     | **Mocks parciais** — `IFeatureFlagRepository` + `ICache` + `IEnvFallback` como `vi.fn()`. |
| `application/use-cases`     | **Mocks do repo + cache + auditLogger**. Sem DB real.                                     |
| `infrastructure/repository` | **Mock do `PrismaService`** com `vi.fn()` para cada delegate.                             |
| `infrastructure/cache`      | **Mock do cliente Redis** (`ioredis`). LRU in-process é real.                             |
| `presentation/controller`   | **Mocks dos use cases**. DTOs validados por Zod (sem mock).                               |
| `presentation/guard`        | **Mock do ExecutionContext** com `switchToHttp().getRequest()`.                           |

### 3.2 Frontend (Vitest + Testing Library + jsdom)

| Camada                    | Estratégia                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `infrastructure/client`   | **Mock de `fetch`** com `vi.fn()`. `vi.useFakeTimers()` para polling.               |
| `infrastructure/provider` | Hook testado com `renderHook` + `act`.                                              |
| `application/use-cases`   | **Mock de `fetch`**. Sem servidor real.                                             |
| `components/admin/...`    | `@testing-library/react` + `userEvent`. Sem roteador real (mock `next/navigation`). |

### 3.3 E2E (Playwright + Chromium headless)

- API: `page.request.post/get` direto para `/api/v1/...` (mais rápido que UI para setup).
- Seed: já existe `pnpm test:e2e:seed` que popula DB com admin/customer/waiter.
- DB é real (testcontainers via docker-compose). Redis é real.
- Polling: usar `vi.useFakeTimers()` no front; no Playwright usar `waitFor` com timeout real.

---

## 4. Como Rodar Localmente

### Pré-requisitos

```bash
docker-compose -f docker-compose.dev.yml up -d   # Postgres + Redis + Mailpit
pnpm install
pnpm db:migrate                                  # aplicar migrations do Prisma
pnpm db:seed                                     # popular 8 flags seed
```

### 4.1 BDD (Gherkin)

**Status:** ainda não há runner Gherkin (cucumber) configurado no projeto. Os `.feature` em `apps/api/test/features/` estão prontos para integração com `@cucumber/cucumber` ou `playwright-bdd` (decisão do time).

```bash
# Após implementação do runner:
pnpm test:bdd                                    # suite BDD completa
pnpm test:bdd -- features/gerenciar-flags.feature # 1 arquivo
```

### 4.2 Unit tests — Backend

```bash
pnpm --filter @pedi-ai/api test                                           # todos
pnpm --filter @pedi-ai/api test -- tests/unit/domain/admin/feature-flags # só domínio
pnpm --filter @pedi-ai/api test:coverage                                 # com cobertura
```

Cobrar ≥ 80% em `apps/api/src/{domain,application,infrastructure,presentation}/admin/feature-flags/`.

### 4.3 Unit tests — Frontend

```bash
pnpm test                                          # 154 arquivos, 1852 testes existentes + novos
pnpm test -- tests/unit/infrastructure/feature-flags
pnpm test -- tests/unit/components/admin/feature-flags
pnpm test:coverage
```

### 4.4 E2E (Playwright)

```bash
pnpm test:e2e:seed                                                # popular DB
pnpm test:e2e -- --grep "Feature Flags"                           # só este spec
pnpm test:e2e:shard:admin                                         # shard admin (inclui feature-flags)
pnpm test:e2e                                                     # suite completa
```

Para testes lentos (RNF-PERF-FF-01 / RNF-AVAIL-FF-01 com DB down):

```bash
docker-compose -f docker-compose.dev.yml stop postgres redis    # derruba DB+Redis
pnpm test:e2e -- --grep "@RNF-AVAIL"                            # roda fallback
docker-compose -f docker-compose.dev.yml up -d                  # restaura
```

### 4.5 Lint + build

```bash
pnpm lint                                                        # ESLint (root)
pnpm --filter @pedi-ai/api lint
pnpm --filter @pedi-ai/api build
pnpm validate:quick                                              # lint + build + unit (root)
```

---

## 5. Critérios de "Pronto para Merge" por Fase

### F1 — Foundation (CRUD + cache + seed)

- [ ] Todos os `.spec.ts` da Fase 1 passando (verde).
- [ ] Cobertura ≥ 80% em `apps/api/src/{domain,application,infrastructure,presentation}/admin/feature-flags/`.
- [ ] Cenários BDD de `gerenciar-flags.feature` verdes.
- [ ] E2E `feature-flags.spec.ts` (testes de owner feliz) verdes.
- [ ] `pnpm validate:quick` verde.
- [ ] Pelo menos 1 commit por par `R/G` (TDD disciplinado — histórico mostra RED→GREEN).

### F2 — Targeting & Avaliação

- [ ] `FeatureFlagEvaluator.spec.ts` cobre 100% das combinações de precedência (USER > RESTAURANT > USER puro > GLOBAL > default) e rollout determinístico.
- [ ] Teste estatístico de rollout 50% em 1000 usuários passa (intervalo 400-600 true).
- [ ] Fallback env-var testado com DB+Redis desligados em docker-compose.
- [ ] Cenários BDD de `avaliar-flags.feature` e `aplicar-overrides.feature` verdes.
- [ ] E2E `feature-flags.spec.ts` (override RESTAURANT + propagação 30s) verde.

### F3 — SDK Cliente

- [ ] `FeatureFlagClient.test.ts` cobre polling 30s com fake timers, cache em memória, ETag em localStorage, fallback em erro de rede.
- [ ] `FeatureFlagProvider.test.tsx` cobre useFeatureFlag com/sem Provider.
- [ ] 11 callers atuais de `isMultiRestaurantEnabled()` continuam funcionando sem mudança (teste de compatibilidade).

### F4 — UI Admin

- [ ] Componentes `TabelaFeatureFlags`, `ModalOverrideFeatureFlag`, `AuditLogViewer` com cobertura ≥ 80%.
- [ ] Snapshots em pt-BR validados (RNF-I18N-FF-01).
- [ ] Acessibilidade axe-core: zero violações graves.
- [ ] E2E: Owner liga flag via UI e propaga em ≤ 30s (verde).
- [ ] E2E: Manager vê audit log mas botões desabilitados (RBAC visual).

### F5 — Observabilidade

- [ ] Métricas Prometheus expostas em `/metrics`:
  - `feature_flag_evaluations_total{key, scope, hit}`
  - `feature_flag_cache_hits_total{layer}`
  - `feature_flag_fallback_total{reason}`
  - `feature_flag_evaluate_duration_seconds`
- [ ] Dashboard Grafana `infrastructure/grafana/dashboards/feature-flags.json` versionado.
- [ ] Runbook `docs/runbooks/FEATURE_FLAGS_INDISPONIVEIS.md` criado.

### Global (antes de merge)

- [ ] `pnpm rtm` regenera RTM sem `Missing` para RF-ADM-FF-01..10.
- [ ] Cobertura ≥ 80% em todos os módulos novos + SDK.
- [ ] Todos os RFs têm **≥ 1 cenário BDD** + **≥ 1 teste unit** + **≥ 1 teste E2E** mapeados.
- [ ] CI verde (lint + typecheck + unit + e2e + bdd).
- [ ] PR com **≥ 1 aprovação** de mantenedor + `pnpm rtm` commitado.

---

## 6. Riscos de Testabilidade (a serem tratados pelo backend/frontend)

| #   | Risco                                                                                                    | Mitigação recomendada                                                                                               |
| --- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | **Polling 30s** introduz flakiness em testes E2E (timing sensível)                                       | Usar `waitFor` com timeout 35s; jamais `sleep` fixo. Marcar `@slow` para CI nightly.                                |
| 2   | **Cache Redis** compartilhado entre testes pode causar falsos positivos/negativos                        | Limpar Redis entre specs: `redis-cli FLUSHDB` em `globalSetup` ou usar TTL curto (60s) e prefixo `ff:` para isolar. |
| 3   | **FNV-1a 64-bit** depende de implementação determinística — bibliotecas diferentes dão hashes diferentes | Fixar implementação inline em `packages/feature-flags/src/hash.ts`; coberta por teste de golden value.              |
| 4   | **Rate limit 100/min/IP** no /evaluate torna testes de carga instáveis                                   | Mockar `@nestjs/throttler` em unit tests; em E2E usar IPs diferentes via `--workers` ou pular com tag `@load-test`. |
| 5   | **Audit log cresce** — pode estourar tempo de seed em E2E                                                | Limpar `feature_flag_audit_logs` antes de cada spec que valida contagem; não confiar em valor absoluto.             |
| 6   | **Compat shim** em `apps/web/src/lib/feature-flags.ts` precisa passar em testes existentes               | Manter testes do shim (`tests/unit/lib/feature-flags.test.ts`) verdes durante migração.                             |
| 7   | **Server-side SDK** chama /evaluate por HTTP — vira teste de integração                                  | Em unit, mockar HttpClient. Em integration (F3), usar testcontainers da API.                                        |

---

## 7. Pendências / Próximos Passos

1. **Implementar o runner BDD** (`@cucumber/cucumber` ou `playwright-bdd`). Sem runner, os `.feature` são documentação executável parcial.
2. **Definir módulo compartilhado** `packages/feature-flags/` com Zod schema único (F3 do tasks.md).
3. **Adicionar fixture Playwright** `managerUser` no `seed.ts` (atualmente só temos admin/customer/waiter — o teste "manager 403" usa waiter como proxy).
4. **Criar script `pnpm rtm`** que varre `@spec(RF-ADM-FF-*)` e gera `docs/requirements/RTM.md` (citado em `.openspec/AGENTS.md §7`).
5. **Adicionar mutacheck** em `prisma-feature-flag-repository.ts` e `feature-flag-evaluator.ts` (código crítico).
6. **Documentar** como adicionar uma nova flag em `docs/guides/FEATURE_FLAGS.md` (F3 do tasks.md).
