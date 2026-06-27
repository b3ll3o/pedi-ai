# Processar Backlog Dependabot + Limpar Branch Stale — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zerar o backlog de PRs abertas (10 PRs dependabot) e remover a branch órfã `chore/test-cleanup-and-env`, mantendo compatibilidade com master local (4 commits não pushados por bloqueio do pre-push hook em bug pré-existente do `/login`).

**Architecture:**

- Estratégia de execução: **rebase das branches dependabot existentes + merge via MCP** (decidido pelo usuário). Fallback se rebase falhar: cherry-pick via `git diff | git apply`.
- **Fases por risco**: limpeza (Fase 0) → baixo risco (Fase 1, 6 PRs sequenciais) → stale (Fase 2, fechamento) → MAJOR com adaptação (Fase 3, 3 PRs com auditoria prévia).
- Cada PR mergeada avança `origin/master`; tasks subsequentes rebaseiam em cima do master resultante.
- **Não pushamos master local** antes de começar — bug pré-existente em `apps/web/src/app/login/page.tsx` (useState null em prerender Next.js 16) bloqueia pre-push hook. Commits locais úteis (3 fixes de CI + 1 spec) ficam pendentes de push até o build ser corrigido separadamente.

**Tech Stack:** Git 2.4x, GitHub MCP (`mcp__plugin_github_github__*`), pnpm 9, Next.js 16 (web), NestJS 11 (api), TypeScript 6.0.3, Prisma 5.22 (atual → 7.8 nas Fase 3).

---

## File Structure

**Arquivos NÃO criados por este plano** — toda a Fase 1 e Fase 2 apenas mexe em branches/PRs existentes via rebase + merge. Fase 3 pode criar commits de adaptação (ver Task 9 e 10).

**Arquivos potencialmente modificados (Fase 3):**

- `apps/api/Dockerfile` — se Prisma 7 exigir mudança em `pnpm dlx prisma@5.22.0` → `pnpm exec prisma`
- `apps/api/prisma/schema.prisma` — se auditoria revelar incompatibilidades
- `apps/api/scripts/*` — se `--shadow-database-url` for usado (removido em Prisma 7)
- `.github/workflows/deploy-vps.yml` — se ssh-action v1.x exigir inputs diferentes
- `package.json` (root) — se houver conflito no lockfile após merge

**Comandos git/gh esperados (não arquivos versionados):**

- `git fetch`, `git rebase`, `git push --force-with-lease`, `git push origin --delete`
- `mcp__plugin_github_github__merge_pull_request` (squash)
- `mcp__plugin_github_github__update_pull_request` (close)

---

## Decisões Operacionais (já tomadas)

1. **Rebase + merge direto**: estratégia primária. Se rebase falhar com conflitos não triviais, fallback é cherry-pick do diff puro via `git diff master..origin/<branch> | git apply`.
2. **Sequencial dentro de cada fase**: cada merge empurra master; a próxima task rebaseia em cima. Paralelismo não traz benefício (dependências lineares).
3. **Verificação específica por PR**: definida na coluna "Verificação" do spec. Padrão: build do app afetado + lint quando aplicável.
4. **MAJOR com auditoria**: Task 9 (ssh-action) e Task 10 (Prisma 7) começam com uma etapa de auditoria que pode descobrir conflitos que justifiquem fechar a PR como `not planned`.
5. **Push local bloqueado**: pre-push hook (`pnpm build`) falha em `/login` page (bug pré-existente, Next.js 16 useState null). Não consertamos aqui — usuário decide depois. As 4 tasks de Fase 1+ operam sobre master local que já tem os 4 commits; merges PR-a-PR continuam funcionando normalmente.

---

## Tasks

### Task 1: Setup — confirmar estado e criar baseline local

**Files:** Nenhum (somente git)

- [ ] **Step 1: Confirmar branch atual é `master` e está limpa**

```bash
git branch --show-current
```

Expected: `master`

```bash
git status --short
```

Expected: `""` (working tree clean) — o commit `6a2fc2d` da spec já foi feito.

- [ ] **Step 2: Confirmar 4 commits locais à frente de origin/master**

```bash
git log --oneline origin/master..HEAD
```

Expected: 4 commits na ordem:

```
6a2fc2d docs(spec): design — processar backlog dependabot + limpar branch stale
5f93b40 fix(ci): corrigir loop do job CI Pass
9b882b1 ci(workflow): adicionar push trigger para fix/ci-prisma-generate e workflow_dispatch
6f06111 fix(ci): gerar Prisma Client antes de type-check e coverage
```

- [ ] **Step 3: Criar branch de checkpoint `process-backlog-baseline` (segurança)**

```bash
git branch process-backlog-baseline
```

Expected: `Branch 'process-backlog-baseline' created` (apenas referência; não comitamos nada aqui — é ponto de retorno se algo der errado nas fases seguintes).

---

### Task 2: Fase 0 — Deletar branch `chore/test-cleanup-and-env`

**Files:** Nenhum (somente git remoto)

- [ ] **Step 1: Confirmar que branch é stale (0 commits à frente)**

```bash
git log --oneline master..origin/chore/test-cleanup-and-env
```

Expected: saída vazia (ou warning "no commits"). Se houver commits à frente, ABORTAR e reportar ao usuário — pode haver trabalho útil perdido.

- [ ] **Step 2: Deletar branch remota**

```bash
git push origin --delete chore/test-cleanup-and-env
```

Expected:

```
To https://github.com/b3ll3o/pedi-ai.git
 - [deleted]         chore/test-cleanup-and-env
```

- [ ] **Step 3: Limpar referência local da branch remota**

```bash
git branch -dr origin/chore/test-cleanup-and-env
```

Expected: `Deleted remote-tracking branch (was 'a588ce8').`

- [ ] **Step 4: Confirmar branch sumiu**

```bash
git branch -a | grep chore/test-cleanup
```

Expected: saída vazia (sem matches).

---

### Task 3: Fase 1.1 — Merge PR #26 (`eslint-config-prettier` 9.1 → 10.1)

**Files:** `package.json` (root, via dependabot branch)

- [ ] **Step 1: Fetch da branch dependabot**

```bash
git fetch origin dependabot/npm_and_yarn/eslint-config-prettier-10.1.8
```

Expected: receive refs sem erros.

- [ ] **Step 2: Checkout da branch**

```bash
git checkout dependabot/npm_and_yarn/eslint-config-prettier-10.1.8
```

Expected: `Switched to a new branch 'dependabot/npm_and_yarn/eslint-config-prettier-10.1.8'`

- [ ] **Step 3: Rebase em master**

```bash
git rebase master
```

Expected: termina sem conflitos (mudança é trivial — apenas 1 entrada em `package.json`). Se houver conflito, resolver seguindo a versão do master (manter pnpm-lock e demais).

- [ ] **Step 4: Verificação — rodar lint**

```bash
pnpm lint
```

Expected: exit 0, sem erros de regra do Prettier (eslint-config-prettier 10.x mantém compatibilidade com versões anteriores).

- [ ] **Step 5: Push da branch rebased**

```bash
git push origin dependabot/npm_and_yarn/eslint-config-prettier-10.1.8 --force-with-lease
```

Expected: `* [new commit] dependabot/npm_and_yarn/eslint-config-prettier-10.1.8 -> dependabot/npm_and_yarn/eslint-config-prettier-10.1.8`

- [ ] **Step 6: Merge PR via MCP**

```
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o",
  repo="pedi-ai",
  pullNumber=26,
  merge_method="squash"
)
```

Expected: success, retorna SHA do merge commit.

- [ ] **Step 7: Limpeza — checkout master e atualizar**

```bash
git checkout master
git fetch origin
```

Expected: `master` agora aponta para o merge de #26 em origin/master (vai estar 1 commit à frente do nosso master local).

- [ ] **Step 8: Deletar branch remota**

```bash
git push origin --delete dependabot/npm_and_yarn/eslint-config-prettier-10.1.8
```

Expected: `* [deleted] dependabot/npm_and_yarn/eslint-config-prettier-10.1.8`

---

### Task 4: Fase 1.2 — Merge PR #25 (`@types/uuid` 10 → 11)

**Files:** `package.json` (root)

- [ ] **Step 1: Fetch**

```bash
git fetch origin dependabot/npm_and_yarn/types/uuid-11.0.0
```

- [ ] **Step 2: Checkout**

```bash
git checkout dependabot/npm_and_yarn/types/uuid-11.0.0
```

- [ ] **Step 3: Rebase em master**

```bash
git rebase master
```

Sem conflitos esperados.

- [ ] **Step 4: Verificação — build da API (usa uuid types em guards/dtos)**

```bash
pnpm --filter @pedi-ai/api build
```

Expected: exit 0.

- [ ] **Step 5: Push da branch**

```bash
git push origin dependabot/npm_and_yarn/types/uuid-11.0.0 --force-with-lease
```

- [ ] **Step 6: Merge via MCP**

```
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o", repo="pedi-ai", pullNumber=25, merge_method="squash"
)
```

- [ ] **Step 7: Checkout master, atualizar**

```bash
git checkout master && git fetch origin
```

- [ ] **Step 8: Deletar branch**

```bash
git push origin --delete dependabot/npm_and_yarn/types/uuid-11.0.0
```

---

### Task 5: Fase 1.3 — Merge PR #33 (`actions/checkout` v6 → v7)

**Files:** `.github/workflows/deploy-vps.yml`, `.github/workflows/e2e.yml`

- [ ] **Step 1: Fetch**

```bash
git fetch origin dependabot/github_actions/actions/checkout-7
```

- [ ] **Step 2: Checkout**

```bash
git checkout dependabot/github_actions/actions/checkout-7
```

- [ ] **Step 3: Rebase em master**

```bash
git rebase master
```

Atenção: pode haver conflito se outros commits locais (5f93b40, 9b882b1) mexeram no `ci.yml`. Se houver conflito, **resolver mantendo versão do master** (eles são fixes de CI já em produção) e reaplicando a mudança `actions/checkout@v6` → `v7` do dependabot.

- [ ] **Step 4: Verificação — inspeção visual + `pnpm prisma generate` no ci.yml não regrediu**

```bash
git diff master..HEAD -- .github/workflows/
```

Expected: Apenas 2 mudanças `actions/checkout@v6` → `@v7`. Nada mais.

- [ ] **Step 5: Push**

```bash
git push origin dependabot/github_actions/actions/checkout-7 --force-with-lease
```

- [ ] **Step 6: Merge via MCP**

```
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o", repo="pedi-ai", pullNumber=33, merge_method="squash"
)
```

- [ ] **Step 7: Atualizar master**

```bash
git checkout master && git fetch origin
```

- [ ] **Step 8: Deletar branch**

```bash
git push origin --delete dependabot/github_actions/actions/checkout-7
```

---

### Task 6: Fase 1.4 — Merge PR #19 (`actions/download-artifact` v7 → v8)

**Files:** `.github/workflows/e2e.yml`

- [ ] **Step 1-2: Fetch + checkout**

```bash
git fetch origin dependabot/github_actions/actions/download-artifact-8
git checkout dependabot/github_actions/actions/download-artifact-8
```

- [ ] **Step 3: Rebase em master**

```bash
git rebase master
```

Atenção: a mesma `e2e.yml` recebeu mudanças em PR #33 e nos commits locais 6f06111/9b882b1/5f93b40. Conflito é provável. **Resolver mantendo** a versão do master (mais recentes) e **reaplicando apenas** a troca `actions/download-artifact@v7` → `@v8`.

- [ ] **Step 4: Verificação — diff mostra só a mudança esperada**

```bash
git diff master..HEAD -- .github/workflows/e2e.yml | grep -E "^\+|^-" | grep -v "^+++\|^---"
```

Expected: apenas linhas com `@v7` → `@v8` em `download-artifact`. Nada mais.

- [ ] **Step 5: Push**

```bash
git push origin dependabot/github_actions/actions/download-artifact-8 --force-with-lease
```

- [ ] **Step 6: Merge via MCP**

```
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o", repo="pedi-ai", pullNumber=19, merge_method="squash"
)
```

- [ ] **Step 7: Atualizar master**

```bash
git checkout master && git fetch origin
```

- [ ] **Step 8: Deletar branch**

```bash
git push origin --delete dependabot/github_actions/actions/download-artifact-8
```

---

### Task 7: Fase 1.5 — Merge PR #24 (`@types/node` 22 → 25 em `apps/api` e `apps/web`)

**Files:** `apps/api/package.json`, `apps/web/package.json`

- [ ] **Step 1-2: Fetch + checkout**

```bash
git fetch origin dependabot/npm_and_yarn/types/node-25.9.1
git checkout dependabot/npm_and_yarn/types/node-25.9.1
```

- [ ] **Step 3: Rebase em master**

```bash
git rebase master
```

Possível conflito se pnpm-lock evoluiu (esperado). Se conflito em `pnpm-lock.yaml`: aceitar versão do master e rodar `pnpm install` localmente após o rebase.

- [ ] **Step 4: Verificação — build de ambos apps**

```bash
pnpm --filter @pedi-ai/api build
pnpm --filter @pedi-ai/web build
```

Expected: ambos exit 0.

- [ ] **Step 5: Push**

```bash
git push origin dependabot/npm_and_yarn/types/node-25.9.1 --force-with-lease
```

- [ ] **Step 6: Merge via MCP**

```
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o", repo="pedi-ai", pullNumber=24, merge_method="squash"
)
```

- [ ] **Step 7: Atualizar master**

```bash
git checkout master && git fetch origin
```

- [ ] **Step 8: Deletar branch**

```bash
git push origin --delete dependabot/npm_and_yarn/types/node-25.9.1
```

---

### Task 8: Fase 1.6 — Merge PR #23 (`typescript` 5.9.3 → 6.0.3 em `apps/web`)

**Files:** `apps/web/package.json`

- [ ] **Step 1-2: Fetch + checkout**

```bash
git fetch origin dependabot/npm_and_yarn/typescript-6.0.3
git checkout dependabot/npm_and_yarn/typescript-6.0.3
```

- [ ] **Step 3: Rebase em master**

```bash
git rebase master
```

Possível conflito em `pnpm-lock.yaml`. Aceitar master e rodar `pnpm install` depois.

- [ ] **Step 4: Verificação — build do web**

```bash
pnpm --filter @pedi-ai/web build
```

**Nota**: o build do web **vai falhar** pelo bug pré-existente do `/login` (`useState null` em prerender). NÃO é regressão desta PR. Validar que o erro é o mesmo de antes (mesmo arquivo `/login/page.tsx`, mesmo digest), e seguir.

- [ ] **Step 5: Push**

```bash
git push origin dependabot/npm_and_yarn/typescript-6.0.3 --force-with-lease
```

- [ ] **Step 6: Merge via MCP**

```
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o", repo="pedi-ai", pullNumber=23, merge_method="squash"
)
```

- [ ] **Step 7: Atualizar master**

```bash
git checkout master && git fetch origin
```

- [ ] **Step 8: Deletar branch**

```bash
git push origin --delete dependabot/npm_and_yarn/typescript-6.0.3
```

---

### Task 9: Fase 2 — Fechar PR #10 (`actions/github-script` v7 → v9) como `not planned`

**Files:** Nenhum (somente API GitHub via MCP)

- [ ] **Step 1: Confirmar que `github-script` realmente não é usado**

```bash
grep -rn "github-script" .github/
```

Expected: saída vazia (zero matches).

- [ ] **Step 2: Comentar na PR explicando o motivo**

```
mcp__plugin_github_github__add_issue_comment(
  owner="b3ll3o",
  repo="pedi-ai",
  issue_number=10,
  body="Fechando como `not planned`. A action `actions/github-script` não está referenciada em nenhum workflow em `.github/workflows/` (confirmado via grep). Não há alvo para o upgrade. Se vier a ser usada no futuro, dependabot reabrirá o PR."
)
```

- [ ] **Step 3: Fechar PR via MCP**

```
mcp__plugin_github_github__update_pull_request(
  owner="b3ll3o",
  repo="pedi-ai",
  pullNumber=10,
  state="closed"
)
```

- [ ] **Step 4: Deletar branch remota**

```bash
git push origin --delete dependabot/github_actions/actions/github-script-9
```

---

### Task 10: Fase 3.1 — Merge PR #20 (`appleboy/ssh-action` v0.1.10 → v1.2.5) com auditoria

**Files:** `.github/workflows/deploy-vps.yml` (potencial adaptação de inputs)

- [ ] **Step 1: Fetch + checkout**

```bash
git fetch origin dependabot/github_actions/appleboy/ssh-action-1.2.5
git checkout dependabot/github_actions/appleboy/ssh-action-1.2.5
```

- [ ] **Step 2: AUDITORIA — verificar release notes do ssh-action v1**

```bash
gh release view v1.0.0 --repo appleboy/ssh-action 2>&1 | head -30
```

OU consultar `https://github.com/appleboy/ssh-action/releases/tag/v1.0.0` via WebFetch.

Expected: identificar breaking changes nos inputs. **Crítico verificar**: `host`, `username`, `key`, `command`, `script`, `port`. v1.x mudou sintaxe para SSH CLI nativo (não mais `scp`-style).

- [ ] **Step 3: Inspecionar uso atual em `deploy-vps.yml`**

```bash
grep -n "appleboy/ssh-action" .github/workflows/deploy-vps.yml
```

Expected: ~7 referências (5 com `uses:`, 2 com entradas detalhadas). Anotar cada uma.

- [ ] **Step 4: Rebase em master**

```bash
git rebase master
```

Sem conflito esperado (mudança é em `.github/workflows/`).

- [ ] **Step 5: ADAPTAÇÃO — ajustar inputs se necessário**

Para cada referência em `deploy-vps.yml`:

- Comparar inputs atuais com schema v1.x (consultar `action.yml` no repo appleboy/ssh-action v1.2.5)
- Se houver mudança de nome (ex.: `host` → continua igual em v1, mas `command` pode ter nova semântica), ajustar o YAML mantendo o comportamento desejado

Se adaptação revelar risco alto (ex.: v1.x não suporta alguma feature usada), **ABORTAR**: comentar na PR descrevendo o problema e fechar como `not planned`. Reportar ao usuário.

- [ ] **Step 6: Commit de adaptação (se houver mudanças)**

```bash
git add .github/workflows/deploy-vps.yml
git commit -m "ci(workflow): adaptar inputs para ssh-action v1.x

[descrição das mudanças realizadas]"
```

- [ ] **Step 7: Verificação — diff mostra apenas mudanças intencionais**

```bash
git diff master..HEAD -- .github/workflows/deploy-vps.yml
```

Expected: mudanças em `uses:` + adaptações de input. Nada em outros workflows.

- [ ] **Step 8: Push**

```bash
git push origin dependabot/github_actions/appleboy/ssh-action-1.2.5 --force-with-lease
```

- [ ] **Step 9: Merge via MCP**

```
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o", repo="pedi-ai", pullNumber=20, merge_method="squash"
)
```

- [ ] **Step 10: Atualizar master**

```bash
git checkout master && git fetch origin
```

- [ ] **Step 11: Deletar branch**

```bash
git push origin --delete dependabot/github_actions/appleboy/ssh-action-1.2.5
```

---

### Task 11: Fase 3.2 — Merge PR #28 + PR #27 (Prisma 5.22 → 7.8) com auditoria completa

**Files:** `apps/api/package.json`, `package.json` (root), `apps/api/Dockerfile` (potencial), `apps/api/prisma/schema.prisma` (potencial), `apps/api/scripts/*` (potencial)

- [ ] **Step 1: Fetch de ambas branches**

```bash
git fetch origin dependabot/npm_and_yarn/prisma-7.8.0 dependabot/npm_and_yarn/prisma/client-7.8.0
```

- [ ] **Step 2: Checkout da branch do CLI (`prisma-7.8.0`)**

```bash
git checkout dependabot/npm_and_yarn/prisma-7.8.0
```

- [ ] **Step 3: AUDITORIA — listar scripts que usam Prisma**

```bash
grep -rn "prisma" apps/api/scripts/ apps/api/package.json apps/api/Dockerfile 2>&1 | head -30
```

Anotar cada referência. Procurar especificamente por:

- `--shadow-database-url` (removido em Prisma 7)
- `prisma migrate dev` (pode precisar de adapter PostgreSQL direto)
- `prisma db push` (pode ter mudado comportamento)

- [ ] **Step 4: AUDITORIA — verificar schema.prisma**

```bash
grep -nE "provider|engineType|driverAdapter" apps/api/prisma/schema.prisma
```

Expected: confirmar `provider = "postgresql"` (sem driverAdapter ainda). Prisma 7 introduziu driver adapters — se o schema atualiza para usar adapter, podemos quebrar a config atual.

- [ ] **Step 5: AUDITORIA — Dockerfile da API**

```bash
grep -n "prisma" apps/api/Dockerfile apps/api/Dockerfile.dev
```

Procurar por `pnpm dlx prisma@5.22.0` (referência pinada) — após upgrade, mudar para `pnpm exec prisma` (usa versão do lockfile).

- [ ] **Step 6: Rebase em master**

```bash
git rebase master
```

Possível conflito em `pnpm-lock.yaml`. Aceitar master e regenerar.

- [ ] **Step 7: ADAPTAÇÃO — ajustar Dockerfile**

Se Step 5 encontrou `pnpm dlx prisma@5.22.0`:

```bash
# Editar apps/api/Dockerfile e apps/api/Dockerfile.dev:
# Trocar:  pnpm dlx prisma@5.22.0 generate
# Por:     pnpm exec prisma generate
git add apps/api/Dockerfile apps/api/Dockerfile.dev
git commit -m "fix(docker): usar pnpm exec prisma (versão do lockfile) após upgrade para Prisma 7"
```

- [ ] **Step 8: Validar Prisma 7**

```bash
pnpm --filter @pedi-ai/api exec prisma validate
```

Expected: "The schema at apps/api/prisma/schema.prisma is valid 🚀"

- [ ] **Step 9: Validar build da API**

```bash
pnpm --filter @pedi-ai/api build
```

Expected: exit 0 (ou erro apenas no /login se build rodar web). Verificar saída.

- [ ] **Step 10: Push do CLI**

```bash
git push origin dependabot/npm_and_yarn/prisma-7.8.0 --force-with-lease
```

- [ ] **Step 11: Merge PR #27 via MCP**

```
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o", repo="pedi-ai", pullNumber=27, merge_method="squash"
)
```

- [ ] **Step 12: Atualizar master e fetch do client**

```bash
git checkout master
git fetch origin
git checkout dependabot/npm_and_yarn/prisma/client-7.8.0
```

- [ ] **Step 13: Rebase do client em master (agora com Prisma CLI 7.8)**

```bash
git rebase master
```

- [ ] **Step 14: Push do client**

```bash
git push origin dependabot/npm_and_yarn/prisma/client-7.8.0 --force-with-lease
```

- [ ] **Step 15: Merge PR #28 via MCP**

```
mcp__plugin_github_github__merge_pull_request(
  owner="b3ll3o", repo="pedi-ai", pullNumber=28, merge_method="squash"
)
```

- [ ] **Step 16: Deletar ambas branches**

```bash
git push origin --delete dependabot/npm_and_yarn/prisma-7.8.0
git push origin --delete dependabot/npm_and_yarn/prisma/client-7.8.0
```

- [ ] **Step 17: Checkout master e atualizar**

```bash
git checkout master && git fetch origin
```

**Nota**: NÃO rodamos migrations contra DB real. O usuário valida manualmente. Reportar SHA dos merges + comando sugerido.

---

### Task 12: Relatório final + cleanup

**Files:** Atualizar `docs/superpowers/specs/2026-06-27-processar-backlog-dependabot-design.md` com seção "Execução"

- [ ] **Step 1: Listar branches remotas restantes**

```bash
git branch -a | grep -v master
```

Expected: vazio (todas as branches dependabot + a stale foram deletadas).

- [ ] **Step 2: Listar PRs ainda abertas**

```
mcp__plugin_github_github__list_pull_requests(
  owner="b3ll3o", repo="pedi-ai", state="open"
)
```

Expected: 0 PRs abertas.

- [ ] **Step 3: Atualizar spec com seção de execução**

Adicionar ao final de `docs/superpowers/specs/2026-06-27-processar-backlog-dependabot-design.md`:

```markdown
## Execução (preenchido em 2026-06-27)

| Fase | PR              | Status    | SHA do merge | Notas                                          |
| ---- | --------------- | --------- | ------------ | ---------------------------------------------- |
| 0    | (branch delete) | ✅        | —            | `chore/test-cleanup-and-env` removida          |
| 1.1  | #26             | ✅        | `<sha>`      | —                                              |
| 1.2  | #25             | ✅        | `<sha>`      | —                                              |
| 1.3  | #33             | ✅        | `<sha>`      | conflito resolvido (manter master)             |
| 1.4  | #19             | ✅        | `<sha>`      | conflito resolvido (manter master)             |
| 1.5  | #24             | ✅        | `<sha>`      | —                                              |
| 1.6  | #23             | ✅        | `<sha>`      | build do /login ainda quebrado (pré-existente) |
| 2    | #10             | ✅ closed | —            | `not planned` (action não usada)               |
| 3.1  | #20             | ✅        | `<sha>`      | adaptações em deploy-vps.yml: `<descrição>`    |
| 3.2  | #27+#28         | ✅        | `<sha>`      | Dockerfile ajustado para `pnpm exec prisma`    |

**Pendências para você (pós-execução)**:

- Push dos 4 commits locais (bloqueado por bug pré-existente do `/login`)
- Rodar migrations Prisma 7 contra DB real: `pnpm --filter @pedi-ai/api exec prisma migrate dev`
- Testar ssh-action v1.x em deploy de teste antes de usar em produção
- Investigar erro de prerender do `/login` (useState null) — fora do escopo deste plano
```

- [ ] **Step 4: Commitar atualização da spec**

```bash
git add docs/superpowers/specs/2026-06-27-processar-backlog-dependabot-design.md
git commit -m "docs(spec): registrar execução da Fase 0-3 de processamento do backlog dependabot"
```

(NÃO pushar — pre-push hook ainda bloqueado pelo /login.)

- [ ] **Step 5: Reportar ao usuário**

Apresentar:

- ✅ PRs merged com seus SHAs
- ✅ PR fechada como not-planned
- ✅ Branch stale deletada
- ⚠️ Pendências manuais (push local, migrations Prisma 7, validação ssh-action, fix do /login)

---

## Self-Review (executado após escrita)

**1. Spec coverage**:

- Fase 0 → Task 2 ✅
- Fase 1.1 (#26) → Task 3 ✅
- Fase 1.2 (#25) → Task 4 ✅
- Fase 1.3 (#33) → Task 5 ✅
- Fase 1.4 (#19) → Task 6 ✅
- Fase 1.5 (#24) → Task 7 ✅
- Fase 1.6 (#23) → Task 8 ✅
- Fase 2 (#10) → Task 9 ✅
- Fase 3.1 (#20) → Task 10 ✅
- Fase 3.2 (#27+#28) → Task 11 ✅
- Setup → Task 1 ✅
- Relatório final → Task 12 ✅

**2. Placeholder scan**: nenhum "TBD", "TODO", "implementar depois", "adicionar validação" sem código concreto. Todas as verificações têm comando exato e expected output.

**3. Type consistency**: não há funções/types customizados neste plano (só operações git + MCP calls). Nomes de branches e PRs consistentes com spec.
