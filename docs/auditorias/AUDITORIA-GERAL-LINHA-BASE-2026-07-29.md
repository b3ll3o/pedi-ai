# Auditoria Geral — Linha-Base Confiável — 2026-07-29

> **Escopo:** Fase 0 da limpeza incremental do monorepo Pedi-AI.
> **Documento-guarda-chuva:** `docs/superpowers/specs/2026-07-28-auditoria-limpeza-geral-design.md`.
> **Plano de execução:** `docs/superpowers/plans/2026-07-29-auditoria-linha-base.md` (commit `d9df2ac`).
> **Branch auditado:** `chore/auditoria-limpeza-geral-2026-07-28` @ `4ac3588`.
> **Tipo de auditoria:** somente leitura + evidência local (sem push, sem acesso a produção, sem carga destrutiva).

---

## 1. Resumo executivo

| Categoria                                           | Status                    | Notas                                                                                                                                                                                     |
| --------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compilação TypeScript (web + api + shared)          | ✅ OK                     | Sem erros em todas as camadas.                                                                                                                                                            |
| ESLint raiz                                         | ⚠️ 422 avisos             | 0 erros; maioria prettier/format.                                                                                                                                                         |
| Complexidade ciclomática (limite 15)                | ✅ OK                     | 0 violações em `apps/api` e `apps/web`.                                                                                                                                                   |
| Complexidade ciclomática (limite 10, aspiracional)  | ⚠️ 57 violações           | Concentradas em formulários admin e componentes React densos.                                                                                                                             |
| Testes unitários + integração + feature-flags + api | ✅ OK                     | 2 662 passados, 2 ignorados, 0 falhas.                                                                                                                                                    |
| Coverage global (raiz)                              | ✅ OK                     | 88,72% stmts / 81,25% branches / 89,5% fns / 89,88% lines.                                                                                                                                |
| Coverage `apps/api`                                 | ❌ Falha branches         | 78,75% (limite 80%).                                                                                                                                                                      |
| Coverage `packages/feature-flags`                   | ❌ Falha branches         | 69,86% (limite 80%).                                                                                                                                                                      |
| Build NestJS (`pnpm --filter @pedi-ai/api build`)   | ✅ OK                     | `exit=0`, 10 s.                                                                                                                                                                           |
| `openapi:export`                                    | ❌ Script defeituoso      | Procura `dist/openapi.yaml` (gerado só em runtime).                                                                                                                                       |
| BDD `@gerenciar-flags`                              | ⚠️ Bloqueado por ambiente | Exige DB ativo (Prisma init).                                                                                                                                                             |
| Dredd (contrato)                                    | ⚠️ Inspecionado passivo   | Sem `dredd.yml`/`api-description.apib`; exige API ativa.                                                                                                                                  |
| Docker efêmero (PG :55432, API :13001, Web :13000)  | ✅ OK                     | Stack subiu, prisma db push OK, health checks OK (rotas reais `/`, `/ready`, `/health/db`, `/health/full`).                                                                               |
| E2E `pnpm test:e2e:{smoke,critical,fast}`           | ❌ Pré-bloqueio           | Bug de fixtures em `playwright-fixtures.ts`.                                                                                                                                              |
| Limpeza E2E (containers, portas)                    | ✅ OK                     | Containers e portas liberados, sem resíduos.                                                                                                                                              |
| `pnpm audit`                                        | ❌ 45 vulnerabilidades    | 4 critical, 19 high, 21 moderate, 1 low.                                                                                                                                                  |
| `pnpm.overrides` raiz                               | ✅ Pinado                 | 12 overrides ativos (postcss, ws, brace-expansion, uuid, minimatch, cross-spawn, js-yaml, vite, esbuild, @babel/core, ioredis, @opentelemetry/sdk-trace-base).                            |
| Gitleaks                                            | ⚠️ Indisponível           | Binário não presente — pulado em modo best-effort.                                                                                                                                        |
| Workflows GitHub + Husky                            | ✅ Mapeados               | 5 workflows; hooks `pre-commit` (lint-staged), `pre-push` (`pnpm build`), `commit-msg` (commitlint).                                                                                      |
| `pnpm rtm`                                          | ✅ OK                     | 74 RFs únicos; 56 Done, 4 Partial, 14 Planned, 0 Missing.                                                                                                                                 |
| Links em `docs/`                                    | ✅ Mapeados               | 35 arquivos MD, 107 ocorrências Markdown (62 relativas, 45 absolutas), 112 URLs HTTP únicas 96.                                                                                           |
| Comandos pnpm documentados                          | ⚠️ Desalinhamento         | 3/10 do top-10 são scripts raiz literais (`rtm`, `build`, `lint`); `pnpm validate:quick` documentado sem script; `pnpm dlx prisma@5.22.0` cita versão divergente do Prisma 7.8 instalado. |

---

## 2. Princípios e restrições seguidas (verbatim da sessão)

- **Sem acesso a produção ou serviços externos reais.**
- **Nenhum push** foi realizado sem autorização adicional.
- **Commits pequenos e separados por fase** — a Fase 0 produziu apenas commits de plano e correção defensiva de Docker (ver §10).
- **Fora do escopo conservador:** migrações de schema/DB, refatorações DDD extensas e mudanças incompatíveis.
- **Sem carga/stress destrutivo.**
- **Sem apagar arquivos sem verificar uso, referências e histórico.**
- **Hipóteses ≠ defeitos:** itens marcados como "drift finding" exigem investigação adicional antes de correção.
- **Teste pulado ou execução com zero testes não pode ser descrito como sucesso.** Os gates com saída zero (gitleaks, BDD) estão explicitamente rotulados como `skipped` ou `env-block`.

---

## 3. Metodologia

A Fase 0 foi organizada em **6 gates sequenciais** (0 → 6), cada um com sub-tarefas despachadas a subagentes isolados (modelo de revisão em dois estágios, conforme skill `subagent-driven-development`). Todos os artefatos foram coletados em `/tmp/auditoria-2026-07-29/` com separação `logs/` (saídas brutas), `raw/` (sumários e arquivos derivados) e snapshots imutáveis por SHA auditado.

```
Gate 0 — Contexto e baseline (Tasks 0.1–0.3)
Gate 1 — Compilação e qualidade estática (Tasks 1.1–1.4)
Gate 2 — Testes rápidos + coverage (Tasks 2.1–2.5)
Gate 3 — Builds e contratos (Tasks 3.1–3.4)
Gate 4 — Infraestrutura Docker + E2E (Tasks 4.1–4.8; 4A e 4B)
Gate 5 — Segurança e operação (Tasks 5.1–5.4)
Gate 6 — Documentação (Tasks 6.1–6.3)
```

### 3.1 Drift externo observado (reflog)

O reflog da sessão registra múltiplas trocas de branch feitas por outro agente durante a coleta, com cherry-pick aplicado ao `master`:

| Timestamp           | Movimento                                                                        | Observação                                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-29T02:42:22 | checkout: `master → chore/auditoria-limpeza-geral-2026-07-28`                    | Início do Gate 0 no branch auditado.                                                                                                                                                                       |
| 2026-07-29T02:55:43 | commit: `fix(api): invalidar cache incremental do tsc para emitir módulos novos` | Commit externo aplicado ao **branch auditado** (22 linhas em `.dockerignore`, `apps/api/Dockerfile`, `apps/api/Dockerfile.dev`). Mantido por ser correção defensiva de build dentro do escopo conservador. |
| 2026-07-29T02:56:29 | checkout: `chore/auditoria... → master` + cherry-pick `c3fb0a0`                  | Outro agente moveu HEAD para `master`.                                                                                                                                                                     |
| (Gate 6)            | cálculo de links/comandos                                                        | Recalculado sobre snapshot imutável `c7f948c` no diretório `/tmp/auditoria-2026-07-29/source-c7f948c` para preservar a linha-base auditada; números idênticos nos dois refs.                               |

**Implicação:** o branch local reflete um commit externo adicional (`4ac3588`) que **não estava presente** no início da Fase 0. O commit é aceito como parte do estado atual mas **não** é assumido como defeito da auditoria.

---

## 4. Gate 0 — Contexto e baseline (Tasks 0.1–0.3)

**Artefatos:** `/tmp/auditoria-2026-07-29/raw/01-reflog.txt`, `02-head.txt`, `03-recent-commits.txt`, `04-spec-diff.txt`, `05-api-tracked.txt`, `06-web-tracked-count.txt`, `07-tests-tracked-count.txt`, `08-openspec-tracked.txt`, `09-docs-requirements.txt`, `10-tags.txt`, `11-remotes.txt`.

- Branch inicial da auditoria: `chore/auditoria-limpeza-geral-2026-07-28` @ `c7f948c`.
- HEAD anterior ao início dos gates: `d9df2ac docs(auditoria): plano detalhado da Fase 0 (linha-base confiável)` (commit do plano).
- Estado rastreado (pré-Phase 0): 1 arquivo modificado fora do baseline limpo — `apps/api/package.json` (mudança pré-existente, sem impacto no fluxo da Fase 0).
- Workspaces reconhecidos pelo pnpm: `apps/api`, `apps/web`, `packages/shared`, `packages/feature-flags`.
- Diretório `docs/requirements/` rastreado; `.openspec/` populado.

---

## 5. Gate 1 — Compilação e qualidade estática (Tasks 1.1–1.4)

**Artefatos:** `20-web-tsc-exit.txt`, `21-shared-tsc.log`, `22-api-tsc.log`, `23-web-tsc.log`, `30-root-lint.log`, `31-root-lint-summary.txt`, `40-api-complexity.log`, `41-web-complexity.log`, `42-complexity-summary.txt`.

### 5.1 `tsc --noEmit`

| Camada            | Resultado |
| ----------------- | --------- |
| `packages/shared` | ✅ OK     |
| `apps/api`        | ✅ OK     |
| `apps/web`        | ✅ OK     |

### 5.2 ESLint raiz (`pnpm lint`)

- `exit=0`, **0 erros**, **422 avisos** (todos `prettier/prettier` ou complexidade).
- Por workspace:
  - `apps/web`: 372 avisos (333 autocorrigíveis com `--fix`).
  - `apps/api`: 50 avisos (42 autocorrigíveis).
- Arquivo mais ruidoso: `apps/web/tests/e2e/tests/production/health.spec.ts` (98 avisos) — predominantemente formatação.
- Distribuição de avisos: 100% prettier + complexidade; **nenhum aviso de bug real** identificado no Gate 1.

### 5.3 Complexidade ciclomática

Limite atual configurado em **15** (em `apps/api/eslint.config.mjs:70` e `apps/web/eslint.config.mjs:98`):

| Workspace | Limite            | Violações |
| --------- | ----------------- | --------- |
| apps/api  | 15                | **0**     |
| apps/web  | 15                | **0**     |
| apps/api  | 10 (aspiracional) | 9         |
| apps/web  | 10 (aspiracional) | 48        |

Distribuição no `apps/api` (limite 10): 4×11, 2×12, 2×14, 1×15.

Distribuição no `apps/web` (limite 10): 7×15, 5×14, 13×11, 12×13, 11×12.

**Top 5 hotspots (api):**

1. `apps/api/src/auth/secret-strength.ts:23` — `$allOperations` (15) — Swagger auth setup.
2. `apps/api/src/payments/payments.service.ts:339` — `validateHmacSignatureV1` (14) — webhook Mercado Pago.
3. `apps/api/src/domain/admin/feature-flags/value-objects/FlagValue.ts:34` — VO `criar` (14).
4. `apps/api/src/payments/payments.service.ts:34` — `criar` (14).
5. `apps/api/src/health/health.controller.ts:62` — `readiness` (12).

**Top 5 hotspots (web):**

1. `apps/web/src/infrastructure/external/PixAdapter.ts` (2×11).
2. `apps/web/src/hooks/useProductFormState.ts` (2×11).
3. `apps/web/src/components/admin/feature-flags/ModalOverrideFeatureFlag.tsx` (2×11).
4. `apps/web/src/components/admin/TeamManagement.tsx` (2×11).
5. `apps/web/src/components/admin/RestaurantSelector.tsx` (2×11).

**Finding (drift):** 57 funções entre 11–15 indicam densidade de regras em formulários admin e hooks de orquestração. Recomenda-se Fase 2 (cleanup) com extração de sub-componentes ou estratégias de tabela de despacho, **mas não** nesta Fase 0.

---

## 6. Gate 2 — Testes rápidos e coverage (Tasks 2.1–2.5)

**Artefatos:** `50-web-test-unit.log`, `51-ff-test.log`, `52-web-test-integration.log`, `53-api-test.log`, `54-55-coverage logs`, `56-coverage-raw.json`, `57-gate2-summary.txt`.

### 6.1 Execução de testes

| Task      | Comando                                     | Exit  | Resultado                                         |
| --------- | ------------------------------------------- | ----- | ------------------------------------------------- |
| 2.1       | `pnpm test:unit` (raiz)                     | 0     | 2050 passados, 2 ignorados, 176 arquivos, 43,71 s |
| 2.2       | `pnpm --filter @pedi-ai/feature-flags test` | 0     | 15 passados, 2 arquivos, 1,09 s                   |
| 2.3       | `pnpm test:integration` (raiz)              | 0     | 32 passados, 2 arquivos, 48 s                     |
| 2.4       | `pnpm --filter @pedi-ai/api test`           | 0     | 565 passados, 37 arquivos, 3,33 s                 |
| **TOTAL** | —                                           | **0** | **2 662 passados, 2 ignorados, 0 falhas**         |

### 6.2 Coverage (limite global 80%)

**Raiz (`pnpm test:coverage`):** ✅ **exit=0**

| Métrica    | %                 |
| ---------- | ----------------- |
| Statements | 88,72 (2621/2954) |
| Branches   | 81,25 (1157/1424) |
| Functions  | 89,5 (827/924)    |
| Lines      | 89,88 (2496/2777) |

**`apps/api` (`pnpm --filter @pedi-ai/api test:cov`):** ❌ **exit=1**

| Métrica    | %                    | Status          |
| ---------- | -------------------- | --------------- |
| Statements | 87,29 (1559/1786)    | OK              |
| Branches   | **78,75** (934/1186) | **FALHA < 80%** |
| Functions  | 88,56 (302/341)      | OK              |
| Lines      | 87,81 (1478/1683)    | OK              |

**`packages/feature-flags` (`pnpm --filter @pedi-ai/feature-flags test:coverage`):** ❌ **exit=1**

| Métrica    | %                 | Status          |
| ---------- | ----------------- | --------------- |
| Statements | 85,71 (114/133)   | OK              |
| Branches   | **69,86** (51/73) | **FALHA < 80%** |
| Functions  | 87,5 (28/32)      | OK              |
| Lines      | 88,88 (104/117)   | OK              |

**Findings:**

- A raiz passa em todos os thresholds mesmo excluindo presentation/infrastructure/hooks (ver `vitest.config.ts:36-63`).
- O subthreshold de `apps/api` está em **70%** durante a migração DDD (ver `apps/api/vitest.config.ts`), mas o gate raiz usa 80% global — daí a divergência. Sugere-se alinhar config raiz com a realidade da migração DDD antes de exigir 80% em `apps/api`.
- O gap de `feature-flags` (branches 69,86%) é real e merece cobertura adicional em ramos condicionais de overrides (RF-ADM-FF-02, 06, 07, 10 — ver §10 sobre RFs parciais).

---

## 7. Gate 3 — Builds e contratos (Tasks 3.1–3.4)

**Artefatos:** `60-api-build.log`, `61-openapi-export.log`, `62-openapi-stats.txt`, `63-bdd-gerenciar.log`, `64-dredd-contract-inspection.txt`, `65-gate3-summary.txt`.

### 7.1 Build da API

- `pnpm --filter @pedi-ai/api build` → **exit=0**, 10 s.
- Saída: `pnpm --filter @pedi-ai/shared build && tsc && nest build`.
- OpenAPI em `apps/api/openapi.yaml`: **61 paths, 90 operations, 64 531 bytes**.

### 7.2 `pnpm openapi:export` — **defeito do script**

- **Falha esperada** com `exit=1`.
- Causa raiz: `apps/api/scripts/export-openapi.js` referencia `dist/openapi.yaml`, arquivo gerado apenas durante bootstrap runtime (`/api/docs-json`), **não** pelo `nest build`.
- Recomendação para Fase 2 (cleanup): alterar o script para copiar `apps/api/openapi.yaml` ou gerar via `NestFactory.create().getDocument()` em subprocesso.

### 7.3 BDD `@gerenciar-flags` — **bloqueado por ambiente**

- `exit=124` (timeout 30 s) — PrismaClient init sem DB ativo.
- Já esperado no Gate 0; ambiente BDD exige `docker-compose up` antes da execução. **Não conta como defeito do código**.

### 7.4 Dredd (inspeção passiva)

- `dredd@14.1.0` instalado (apps/api devDeps).
- `scripts/dredd-hooks.js` (63 linhas) presente — apenas esqueletos `before/after`.
- `scripts/contract-test.js` orquestra: GET `/api/docs-json` → `npx dredd`.
- **Ausentes:** `dredd.yml` e `api-description.apib` — Dredd nunca executou de fato.
- Sem ambiente API ativo nesta Fase 0; inspeção concluída passivamente.
- Recomendação para Fase 2: remover dredd morto ou configurar contrato de verdade.

---

## 8. Gate 4 — Infraestrutura Docker + E2E (Tasks 4.1–4.8)

**Artefatos:** `70-pg-up.log`, `71-prisma-push.log`, `72-api-up.log`, `73-web-up.log`, `74-api-health.log`, `75-web-health.log`, `76-prisma-seed.log`, `80-e2e-smoke.log`, `81-e2e-critical.log`, `82-gate4a-summary.txt`, `83-e2e-fast.log`, `84-e2e-all.log`, `90-95-cleanup logs`, `95-gate4-summary.txt`.

### 8.1 Gate 4A — Setup isolado

- PostgreSQL em container `audit-pg-55432-159835` na porta **55432** (evita conflito com `docker-compose.dev.yml`).
- `prisma db push` → **exit=0**.
- `prisma db seed` → skipped (sem dado necessário para os gates seguintes).
- API NestJS: PID 161968 em `127.0.0.1:13001` (Fastify).
  - Health check (curl `/health`) → **404** (drift: rota inexistente; plano esperava `/health`).
  - Health check (curl `/`) → 200 com `{"status":"ok","uptime":64}`.
  - Health check (curl `/ready`) → 200.
- Web Next.js: PID 162788 em `127.0.0.1:13000` → 200.
- **Drift finding:** o plano assumiu `/health`; API expõe `/`, `/ready`, `/health/db`, `/health/full`. Próximas fases devem usar `/ready` ou `/health/db` em vez de `/health`.

### 8.2 Gate 4B — E2E (bloqueado por bug pré-existente)

| Task | Comando                  | Exit    | Causa                             |
| ---- | ------------------------ | ------- | --------------------------------- |
| 4.5  | `pnpm test:e2e:smoke`    | 1       | "Test has unknown parameter" × 31 |
| 4.6  | `pnpm test:e2e:critical` | 1       | "Test has unknown parameter" × 31 |
| 4.7  | `pnpm test:e2e:fast`     | 1       | "Test has unknown parameter" × 31 |
| 4.7b | `pnpm test:e2e:all`      | skipped | mesmo bloqueio                    |

**Causa raiz** (pré-existente, **não** introduzida pela Fase 0):

- `apps/web/tests/e2e/tests/playwright-fixtures.ts:28` re-exporta apenas `{ test, expect }` do `@playwright/test`.
- Specs taggeadas (`@critical`, `@smoke`) usam fixtures customizadas `authenticated`, `admin`, `kitchen`.
- `kitchen` **não está definida** em `apps/web/tests/e2e/tests/shared/fixtures/index.ts`.
- Resultado: Playwright aborta o test plan com "Test has unknown parameter" antes de rodar qualquer teste.

**Mitigação explorada:** rodar `tests/smoke.spec.ts` diretamente (sem grep via `pnpm test:e2e:smoke`) → 5 passados, 2 falhas (`/register` e `/login` sem `input[type="email"]`), 2 skipped (exigem seed específico). **Não conta como suite passando**.

**Recomendação para Fase 1 (security) ou Fase 2 (cleanup):**

- Editar `apps/web/tests/e2e/tests/playwright-fixtures.ts` para aplicar `test.extend({ authenticated, admin, kitchen })` baseado em fixtures compartilhadas.
- Adicionar a fixture `kitchen` ausente.

### 8.3 Cleanup

- API killed (PID 161968).
- Web pnpm wrapper killed (PID 162788), bem como `next-server` (162828) e `next dev parent` (162811).
- PG container `audit-pg-55432-159835` removido.
- PG network `audit-net-159835` removido.
- Portas 13000, 13001 e 55432 livres.
- Sem processos ou containers remanescentes.

---

## 9. Gate 5 — Segurança e operação (Tasks 5.1–5.4)

**Artefatos:** `100-pnpm-audit.log`, `101-security-overrides.txt`, `102-gitleaks-version.txt`, `103-gitleaks-exit.txt`, `104-workflows-and-hooks.txt`, `105-gate5-summary.txt`.

### 9.1 `pnpm audit`

- `exit=1` (45 vulnerabilidades reportadas).
- **Severidade:** 1 low, 21 moderate, **19 high, 4 critical**.

**Pacientes críticos (exemplos, não exaustivo):**

| CVE/Advisory        | Pacote          | Caminho de exploração            |
| ------------------- | --------------- | -------------------------------- |
| Prototype Pollution | `json-pointer`  | (transitivo)                     |
| Prototype Pollution | `minimist`      | (transitivo)                     |
| RCE                 | `jsonpath-plus` | (transitivo)                     |
| Randomness inseguro | `form-data`     | requests HTTP com secret em form |

**Pacientes high (exemplos):**

- Next.js Middleware/Proxy bypass em App Router.
- Next.js SSRF em Server Actions.
- Next.js SSRF em rewrites.
- `find-my-way` DDoS com HTTP/2.
- `js-yaml` Exponential parsing time.
- `linkify-it` Quadratic-complexity DoS via `mailto:`.
- `sharp` vulnerabilidades herdadas de libvips.
- `fast-uri` host confusion.

**Pinagens existentes (`pnpm.overrides` em `package.json` raiz):**

```json
{
  "postcss": ">=8.5.10",
  "ws": ">=8.20.1",
  "brace-expansion": ">=5.0.6",
  "uuid": ">=11.0.0",
  "minimatch": ">=10.0.3",
  "cross-spawn": ">=7.0.6",
  "js-yaml": ">=4.2.0",
  "vite": "^8.0.16",
  "esbuild": ">=0.28.1",
  "@babel/core": ">=7.29.1",
  "ioredis": "^5.10.1",
  "@opentelemetry/sdk-trace-base": "^1.28.0"
}
```

**Achados:**

- `js-yaml` e `minimatch` já pinados; ainda assim aparecem como dependências vulneráveis transitivas — sugere-se adicionar à `pnpm.overrides` a versão **exata** corrigida.
- As 4 vulnerabilidades critical vêm todas de pacotes transitivos sem override — Fase 1 deve tratá-las com prioridade.
- `packages/shared`, `packages/feature-flags`, `apps/web` e `apps/api` não declaram overrides/resolutions próprios.

### 9.2 Gitleaks — skipped (indisponível)

- Binário `gitleaks` ausente no ambiente.
- Executado em modo **best-effort** e ignorado. Não pode ser descrito como "sem segredos"; apenas como "não verificado".

### 9.3 Workflows e hooks

**Workflows em `.github/workflows/`:**

| Arquivo              | Nome              | Triggers principais                         |
| -------------------- | ----------------- | ------------------------------------------- |
| `ci.yml`             | CI                | `pull_request`, `push`, `workflow_dispatch` |
| `deploy-vps.yml`     | Deploy to VPS     | `push`, `workflow_dispatch`                 |
| `e2e-production.yml` | 🚀 E2E Production | `workflow_dispatch`, `schedule`             |
| `e2e.yml`            | E2E Tests         | (interno, sem trigger visível)              |
| `load-tests.yml`     | 🧪 Load Tests     | `schedule`, `workflow_dispatch`             |

**Hooks em `.husky/`:**

- `pre-commit`: `pnpm exec lint-staged`.
- `pre-push`: `pnpm build` (gate de build antes do push).
- `commit-msg`: `npx --no -- commitlint --edit $1`.

### 9.4 Diff `docker-compose.dev.yml` vs `docker-compose.yml`

- Arquivo `docker-compose.dev.yml` está versionado e diverge do `docker-compose.yml` (commit `b534a14` trouxe ajuste defensivo de bind externo 5432).
- Diferenças são esperadas (env de dev com bind externo opcional); nenhuma anotação de risco.

---

## 10. Gate 6 — Documentação (Tasks 6.1–6.3)

**Artefatos:** `110-pnpm-rtm.log`, `110-rtm-diff.txt`, `110-rtm-generated.md`, `111-rtm-stats.txt`, `112-docs-links.txt`, `113-docs-pnpm-commands.txt`, `114-gate6-summary.txt`, snapshot imutável em `/tmp/auditoria-2026-07-29/source-c7f948c`.

### 10.1 `pnpm rtm` — RTM regenerada

- `exit=0`.
- Arquivo gerado: `docs/requirements/RTM.md` (temporariamente reescrito só com mudança de data; restaurado ao estado original — sem alteração líquida).
- Métricas:
  - 80 RFs declarados nas specs.
  - 112 referências `@spec(...)` no código.
  - 210 referências em testes.
  - Matriz deduplicada: **74 requisitos únicos** — 56 Done, 4 Partial, 0 Missing, **14 Planned**.
  - Cobertura completa (excluindo Planned): **56/60 = 93,33%**.
  - Cobertura com qualquer materialização (excluindo Planned): **60/60 = 100%**.
  - Cobertura completa incluindo Planned: **56/74 = 75,68%**.
- **RFs parciais:** `RF-ADM-FF-02`, `RF-ADM-FF-06`, `RF-ADM-FF-07`, `RF-ADM-FF-10` — todos no BC `admin/feature-flags`. Correlaciona-se com o gap de branches em `packages/feature-flags` (Gate 2).

### 10.2 Links em `docs/`

- 35 arquivos `.md`.
- 107 ocorrências de links Markdown (62 relativas, 45 absolutas) — 102 destinos únicos.
- 112 ocorrências de URLs HTTP (96 únicas).
- **Drift menor:** algumas âncoras Markdown aparecem como "links relativos" para `(#1-fluxo-de-...)` — uso em sumários que misturam `](#anchor)` com links completos. Não é defeito, é ruído de extração.

### 10.3 Comandos pnpm documentados

Top 10 por frequência:

| #   | Comando                           | Ocorrências | Alinhamento                                                     |
| --- | --------------------------------- | ----------- | --------------------------------------------------------------- |
| 1   | `pnpm rtm`                        | 6           | ✅ script raiz literal                                          |
| 2   | `pnpm dlx prisma@5.22.0`          | 5           | ⚠️ comando ad hoc; versão diverge do Prisma **7.8.x** instalado |
| 3   | `pnpm install`                    | 4           | nativo do pnpm                                                  |
| 4   | `pnpm exec prisma`                | 4           | executável direto; há scripts Prisma em `apps/api`              |
| 5   | `pnpm build`                      | 4           | ✅ script raiz literal                                          |
| 6   | `pnpm lint`                       | 3           | ✅ script raiz literal                                          |
| 7   | `pnpm --filter @pedi-ai/api test` | 2           | ✅ script `test` em `apps/api/package.json`                     |
| 8   | `pnpm audit`                      | 2           | nativo do pnpm                                                  |
| 9   | `pnpm validate:quick`             | 1           | ❌ **não existe** em `package.json` raiz                        |
| 10  | `pnpm update @fastify/static`     | 1           | nativo do pnpm                                                  |

**Achados:**

- 3/10 são scripts raiz literais; 1/10 corresponde a script de workspace; 6/10 são comandos nativos/ad-hoc.
- `pnpm validate:quick` deve ser removido da documentação ou substituído pelo script real.
- A documentação cita `prisma@5.22.0` mas o lockfile usa `prisma@7.8.x` — desatualização a corrigir na Fase 3 (docs).

---

## 11. Findings consolidados (Fase 0)

### 11.1 Críticos (bloqueios)

| ID           | Descrição                                                                                             | Origem  |
| ------------ | ----------------------------------------------------------------------------------------------------- | ------- |
| `F0-CRIT-01` | E2E bloqueado por bug de fixtures pré-existente em `apps/web/tests/e2e/tests/playwright-fixtures.ts`. | Gate 4B |
| `F0-CRIT-02` | `apps/api` falha branches no coverage (78,75% < 80%); `feature-flags` falha em 69,86%.                | Gate 2  |
| `F0-CRIT-03` | `pnpm audit` reporta 4 vulnerabilidades critical + 19 high + 21 moderate.                             | Gate 5  |

### 11.2 Altos (drift e dívida)

| ID           | Descrição                                                                                    | Origem      |
| ------------ | -------------------------------------------------------------------------------------------- | ----------- |
| `F0-HIGH-01` | Rota `/health` inexistente na API; plano e healthchecks devem usar `/ready` ou `/health/db`. | Gate 4A     |
| `F0-HIGH-02` | Script `openapi:export` defeituoso (procura `dist/openapi.yaml` inexistente pós-build).      | Gate 3      |
| `F0-HIGH-03` | Dredd sem contrato real (`dredd.yml`/`api-description.apib` ausentes).                       | Gate 3      |
| `F0-HIGH-04` | 4 RFs parciais em `feature-flags` correlacionados com gap de cobertura do pacote.            | Gates 2 + 6 |
| `F0-HIGH-05` | Docs citam `prisma@5.22.0` (versão desatualizada vs 7.8.x).                                  | Gate 6      |
| `F0-HIGH-06` | Doc cita `pnpm validate:quick` que não existe.                                               | Gate 6      |

### 11.3 Médios (qualidade de código)

| ID          | Descrição                                                                                                            | Origem |
| ----------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| `F0-MED-01` | 422 avisos prettier (0 erros); 333 autocorrigíveis com `--fix` em `apps/web`.                                        | Gate 1 |
| `F0-MED-02` | 57 funções entre 11–15 de complexidade (limite atual 15).                                                            | Gate 1 |
| `F0-MED-03` | Cobertura `apps/api` falha no gate raiz global (78,75% vs 80%) embora config local permita 70% durante migração DDD. | Gate 2 |

### 11.4 Baixos (oportunidades)

| ID          | Descrição                                                                            | Origem |
| ----------- | ------------------------------------------------------------------------------------ | ------ |
| `F0-LOW-01` | `gitleaks` indisponível no ambiente; gate pulado em modo best-effort.                | Gate 5 |
| `F0-LOW-02` | Alguns links Markdown em docs/ usam formato `](#anchor)` ambíguo (não URL completa). | Gate 6 |
| `F0-LOW-03` | BDD `@gerenciar-flags` exige DB ativo; ambiente não preparado.                       | Gate 3 |

---

## 12. Recomendações para Fases 1–4 (sem entrar em execução nesta Fase 0)

**Fase 1 — Segurança:**

- Endurecer `pnpm.overrides` com versões exatas para `js-yaml`, `minimatch` (já pinados mas vulneráveis transitivos), `next` (alinhamento com patches), `form-data`, `jsonpath-plus`.
- Investigar caminhos de exploração para `json-pointer`, `minimist`, `jsonpath-plus`, `form-data`.
- Corrigir o bug de fixtures E2E (`playwright-fixtures.ts`) — pré-requisito para validar correções de segurança com testes reais.

**Fase 2 — Cleanup:**

- Corrigir script `openapi:export` para gerar/copiar `openapi.yaml` corretamente.
- Decidir destino do Dredd (manter como contrato real ou remover como peso morto).
- Aplicar `eslint --fix` em `apps/web` para zerar 333 avisos prettier.
- Extrair/refatorar as 57 funções em zona 11–15 (especialmente formularios admin e hooks).
- Alinhar `vitest.config.ts` raiz com `apps/api/vitest.config.ts` (70% durante migração DDD) para evitar falha persistente em coverage.

**Fase 3 — Documentação:**

- Atualizar referências a `prisma@5.22.0` → `7.8.x` em todos os docs.
- Remover ou substituir `pnpm validate:quick` por script real.
- Documentar corretamente as rotas de health (`/ready`, `/health/db`, `/health/full`).
- Adicionar nota sobre bug pré-existente em `playwright-fixtures.ts` (drift finding).

**Fase 4 — Final review:**

- Re-rodar todos os 6 gates e comparar diffs.
- Validar que nenhum commit externo não-auditado foi introduzido.
- Confirmar `pnpm audit` limpo ou com vulnerabilidades aceitas formalmente.
- Tag do release e preparação para push (apenas com autorização adicional).

---

## 13. Aprovações pendentes (não-automatizadas)

Por princípio conservador da Fase 0:

- **Nenhum push foi realizado.** O branch `chore/auditoria-limpeza-geral-2026-07-28` está localmente com 2 commits adicionais (o do plano `d9df2ac` e o externo defensivo `4ac3588`), mas aguarda autorização explícita para `git push`.
- **Nenhum merge para `master`** foi executado.
- **Nenhuma correção automática de código** foi aplicada — todos os findings acima aguardam decisão de Fase.

---

## 14. Anexo — Evidência completa

Diretório `/tmp/auditoria-2026-07-29/`:

- `logs/` — saídas brutas (`.log`) por tarefa.
- `raw/` — sumários (`*-summary.txt`), contagens e estatísticas.
- `coverage/` — relatórios HTML/JSON do Vitest (cobertura).
- `e2e-results/` — resultados Playwright (quando aplicável).
- `e2e-traces/` — traces Playwright.
- `source-c7f948c/` — snapshot imutável do ref auditado para o Gate 6.

Sumários por gate (paths absolutos):

- Gate 0: `raw/01-reflog.txt` … `raw/12-pnpm-workspace.yaml`.
- Gate 1: `raw/31-root-lint-summary.txt`, `raw/42-complexity-summary.txt`.
- Gate 2: `raw/57-gate2-summary.txt`.
- Gate 3: `raw/65-gate3-summary.txt`.
- Gate 4A: `raw/82-gate4a-summary.txt`.
- Gate 4B/Gate 4 final: `raw/95-gate4-summary.txt`.
- Gate 5: `raw/105-gate5-summary.txt`.
- Gate 6: `raw/114-gate6-summary.txt`.

---

**Auditoria conduzida em modo somente leitura + evidência local.**
**Nenhuma alteração destrutiva. Nenhum acesso externo. Nenhum push automático.**
**Próximo passo autorizado:** revisão humana deste relatório + decisão sobre Fase 1 (segurança) vs Fase 2 (cleanup).
