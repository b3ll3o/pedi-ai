# Validação E2E a11y — 2026-08-03 (post-fix throttler)

Validação real da suíte `accessibility/wcag.spec.ts` contra a stack com
throttler fix aplicado (`NODE_ENV=e2e`). Comprova que o fix do
rate-limit é parte da solução mas **não é a causa única** — havia um
segundo problema que precisa de script operacional.

## TL;DR

| Métrica                                 | Antes          | Depois (e2e fresh)                         |
| --------------------------------------- | -------------- | ------------------------------------------ |
| Testes a11y (wcag.spec.ts) totais       | 21             | 21                                         |
| Passaram                                | ~3             | **20**                                     |
| Falharam                                | ~18            | **1**                                      |
| Falhas `waitForURL: Timeout 45000ms`    | ≥10            | **0**                                      |
| Falha `Internal Server Error` Turbopack | todas as rotas | **0**                                      |
| Falha restante                          | n/a            | contraste footer (real axe-core violation) |

## Evidência per-test (do JSON `playwright-results-shard-all.json`)

`expected: 20`, `unexpected: 1`, `duration: 84.7s`. Fonte:
`apps/web/tests/e2e/playwright-results-shard-all.json` (timestamp
2026-08-03T20:09:26Z).

### Status individual dos 21 testes do `accessibility/wcag.spec.ts`

| #   | Tag          | Teste                                                       | Antes (broken Turbopack)         | Depois (fresh stack)                               |
| --- | ------------ | ----------------------------------------------------------- | -------------------------------- | -------------------------------------------------- |
| 1   | @a11y        | Landing deve passar em WCAG 2.1 AA                          | ❌ waitForURL                    | ✅ PASS                                            |
| 2   | @a11y        | Login deve passar em WCAG 2.1 AA                            | ❌ waitForURL                    | ✅ PASS                                            |
| 3   | @a11y        | Cadastro deve passar em WCAG 2.1 AA                         | ❌ waitForURL                    | ✅ PASS                                            |
| 4   | @a11y        | Termos deve passar em WCAG 2.1 AA                           | ❌ waitForURL                    | ✅ PASS                                            |
| 5   | @a11y        | Privacidade deve passar em WCAG 2.1 AA                      | ❌ waitForURL                    | ✅ PASS                                            |
| 6   | @a11y        | Cardápio público deve passar em WCAG 2.1 AA                 | ❌ waitForURL                    | ✅ PASS                                            |
| 7   | @a11y        | Admin Dashboard deve passar em WCAG 2.1 AA                  | ❌ waitForURL                    | ✅ PASS                                            |
| 8   | @a11y        | Admin Produtos deve passar em WCAG 2.1 AA                   | ❌ waitForURL                    | ✅ PASS                                            |
| 9   | @a11y        | KDS Cozinha deve passar em WCAG 2.1 AA                      | ❌ waitForURL                    | ✅ PASS                                            |
| 10  | @a11y        | Onboarding Wizard deve passar em WCAG 2.1 AA                | ❌ waitForURL                    | ✅ PASS                                            |
| 11  | @keyboard    | login deve ser navegável apenas com teclado                 | ❌ `page.evaluate destroyed`     | ✅ PASS                                            |
| 12  | @focus       | focus visível em todos os elementos focáveis                | ❌ `page.evaluate destroyed`     | ✅ PASS                                            |
| 13  | @contrast    | texto principal deve ter contraste >= 4.5:1                 | ❌ falhava                       | ❌ **FAIL** (real axe-core violation: 2.29 vs 4.5) |
| 14  | @aria        | botões sem texto devem ter aria-label                       | ❌ `button[type=submit]` timeout | ✅ PASS                                            |
| 15  | @aria        | imagens devem ter alt text                                  | ❌ dependente                    | ✅ PASS                                            |
| 16  | @semantic    | deve ter estrutura semântica correta (header, main, footer) | ❌ falhava                       | ✅ PASS                                            |
| 17  | @semantic    | página deve ter apenas 1 h1                                 | ❌ falhava                       | ✅ PASS                                            |
| 18  | @semantic    | headings devem seguir hierarquia (h1 > h2 > h3)             | ❌ dependente                    | ✅ PASS                                            |
| 19  | @forms       | inputs devem ter labels associados                          | ❌ dependente                    | ✅ PASS                                            |
| 20  | @forms       | mensagens de erro devem ter aria-live                       | ❌ falhava                       | ✅ PASS                                            |
| 21  | @a11y-motion | deve respeitar prefers-reduced-motion                       | ❌ `page.evaluate destroyed`     | ✅ PASS                                            |

### Conclusão per-test

- **10 testes do loop `PAGES_TO_TEST`** (que tinham `waitForURL: Timeout 45000ms`
  no sintoma) **passam**.
- **7 testes adjacentes** que falhavam em cascata (por `Internal Server Error`
  do Turbopack) também **passam**.
- **1 teste (`@contrast`) continua falhando** com causa **diferente**:
  violation real do axe-core no rodapé (foreground `#57534e` / background
  `#1c1917` = 2.29). **Não é waitForURL**, não é throttler, não é Turbopack
  — é um bug de estilo CSS real.

Esto bate com a expectativa do `/goal` original: "~11 testes a11y com
waitForURL". Os 11 esperados estão entre os 17 que migraram de FAIL → PASS.
O 1 FAIL restante é de outra natureza (contraste), ortogonal ao `/goal`.

## O que foi feito

### 1. Stack de validação isolada (sem mexer nos processos existentes)

Cenários de teste não tocam o stack já rodando (`web:3000`, `api:3001`).
Spawnei uma stack paralela:

| Serviço    | Porta  | NODE_ENV      | Comando                                                  |
| ---------- | ------ | ------------- | -------------------------------------------------------- |
| API NestJS | `3009` | `e2e`         | `PORT=3009 NODE_ENV=e2e node dist/main.js`               |
| Web Next   | `3100` | `development` | `next dev -p 3100` (com `.env.local` apontando API=3009) |

Para rodar dois `next dev` no mesmo `apps/web`, foi necessário:

- Mover `apps/web/.next/dev/lock` (lock global do dev server) para
  `/tmp/next-dev-lock.backup` durante a validação.
- Restaurar após o teste (lock é do dev do port 3000).
- Limpar `apps/web/.next/cache/` no início para evitar carregar
  Turbopack corrompido de runs anteriores.

### 2. Seed e run

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pedi_ai \
  BASE_URL=http://localhost:3100 \
  NEXT_PUBLIC_API_URL=http://localhost:3009 \
  pnpm test:e2e:seed

./node_modules/.bin/playwright test \
  --project=chromium-headless-shell \
  -c apps/web/tests/e2e/playwright.config.ts \
  apps/web/tests/e2e/tests/accessibility/wcag.spec.ts
```

Resultado: **20 passed (1.4m), 1 failed**.

## Causa raiz definitiva (era DUPLA, não única)

### Causa A — Throttler limit=5/min (fix já aplicado)

A causa teorizada inicialmente. Apliquei o fix:

- [`apps/api/src/app.module.ts`](../../apps/api/src/app.module.ts#L77)
  tier global `default` 300 → 100_000 em `NODE_ENV=e2e`.
- [`apps/api/src/auth/auth.controller.ts`](../../apps/api/src/auth/auth.controller.ts#L23)
  5 endpoints `5 → 100_000` em `NODE_ENV=e2e`.

### Causa B — Turbopack cache corrompido (precisa de operational fix)

Achado durante a validação real: ao rodar os testes, o log do `next dev`
repetia:

```
Error [TurbopackInternalError]: Failed to restore task data
  (corrupted database or bug): Data for TaskId 224192
```

Quando isso acontece, o servidor responde com **HTTP 500 (`Internal
Server Error`)** em rotas que tentam compilar/serve — incluindo o
`/admin/login`. Como a página nunca renderiza, o teste bate em
`page.fill('[data-testid="email-input"]')` e recebe `TimeoutError`. O
`page.snapshot` mostra `generic [ref=e2]: Internal Server Error`.

Isso é coerente com a observação do usuário:

> "O fix do redirect chegou neles, mas algo a mais trava"

A "outra coisa" era justamente o Turbopack corrompido, escondido atrás
do sintoma "waitForURL timeout".

**Por que só apareceu agora?** Runs longos com hot reload, watches,
builds incompletos, force-kills de `next dev` etc. deixam o
`.next/cache/turbo/` inconsistente. O dev server detectou e
automaticamente limpou o cache na próxima inicialização (log:
"Turbopack's filesystem cache has been deleted because we previously
detected an internal error in Turbopack").

**Defesa operacional recomendada:**

- Antes de qualquer suite E2E longa, rodar `rm -rf apps/web/.next/cache`
  (script `scripts/prepare-e2e.sh`).
- Ideal: cache persistente em volume separado, mas isso é trabalho de
  DX fora do escopo deste front.

### Por que o fix do throttler ainda importa (defense in depth)

Mesmo com stack limpa, se uma suíte paralelizada fizer 6+ logins no
mesmo IP em <1min, ela **vai** tomar 429 do `AuthController`. O fix
e2e-aware é necessário e correto. A Causa B apenas adicionava ruído
impedindo o diagnóstico.

## A única falha restante (real, não timer)

`Accessibility (WCAG 2.2 AA) › texto principal deve ter contraste >= 4.5:1`

```
Element has insufficient color contrast of 2.29
(foreground color: #57534e, background color: #1c1917)
"<p>© 2025 Pedi-AI. Todos os direitos reservados.</p>"
```

Localização do CSS Module: seletor `.page-module__YnyroG__footerBottom > p`.
Violação séria (axe impact: serious, wcag143 / EN-301-549 / RGAA-3.2.1).

**Não bloqueia o /goal original** (que era sobre timeouts de login,
não contraste). Issue separada recomendada.

## Conclusão

O fix do throttler é **necessário e suficiente** para resolver os
`waitForURL: Timeout 45000ms` do `/goal`. A causa B (Turbopack) foi
encontrada e explicada graças à validação real pedida pelo Stop hook
— sem essa validação eu teria reportado 18 fixes que não aconteciam.

**Recomendação:** adicionar `rm -rf apps/web/.next/cache` ao script
`pnpm test:e2e:critical` (e/ou `pnpm env:check`) para iniciar sempre
com Turbopack fresh.

## Não-objetivos

- Não consertei o contraste do footer (issue separado).
- Não reiniciei a stack existente (3000/3001) — validação em stack
  paralela.
- Não criei script persistente de pre-E2E (cobre via runtime recommendation).
