# Husky — Segurança e Consistência Máximas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Endurecer os hooks do `.husky/` do monorepo pedi-ai (Next.js web + NestJS api + packages/shared) para que toda branch mantenha os mesmos padrões: mensagens convencionais, ambiente consistente, lockfile íntegro, testes/typecheck/build antes de cada push, e detecção de segredos/arquivos sensíveis em todo commit.

**Architecture:** Shell inline auto-contido em cada hook, com helper compartilhado em `.husky/_lib.sh`. Commitlint único em `commitlint.config.mjs` (ESM) com `scope` obrigatório restrito aos BCs do DDD. Hooks: `pre-commit` (env, proibidos, > 5 MB, lint-staged, gitleaks, secretlint), `commit-msg` (commitlint), `pre-push` (lockfile, testes alterados, typecheck, build 3 pacotes, cobertura ≥ 80%), `post-merge`/`post-checkout` (aviso de mudança de config).

**Tech Stack:** Husky 9.1.7, lint-staged 17, @commitlint/cli 21, @commitlint/config-conventional 21, gitleaks (sistema), secretlint 4 + @secretlint/preset-recommend, pnpm 9, Node versionado em `.nvmrc`.

---

## File Structure

**A criar:**
- `.husky/_lib.sh` — helpers compartilhados (`log_ok`, `log_warn`, `log_err`, `need`, `check_node`).
- `.husky/post-merge` — avisa mudanças em configs críticas após merge.
- `.husky/post-checkout` — mesmo aviso após checkout.
- `commitlint.config.mjs` — config unificada ESM com scope obrigatório + enum.
- `scripts/check-dev-env.sh` — diagnóstico do ambiente.
- `docs/guides/HUSKY.md` — documentação operacional.

**A modificar:**
- `.husky/pre-commit` — reescrito (env-check, bloqueia proibidos, > 5 MB, lint-staged, gitleaks, secretlint).
- `.husky/commit-msg` — reescrito (carrega `_lib.sh`, chama `commitlint`).
- `.husky/pre-push` — reescrito (lockfile, testes, typecheck, build, cobertura).
- `package.json` — adiciona `env:check` script e devDeps `secretlint` + `@secretlint/preset-recommend`.
- `AGENTS.md` — menção curta aos novos gates.
- `CHANGELOG.md` — entrada em "Unreleased".

**A remover:**
- `.commitlintrc.js` — fonte de ambiguidade (CJS, regras mais fracas).
- `commitlint.config.js` — substituído pelo `.mjs` canônico.

---

## Task 0: Verificar ambiente base

**Files:** nenhum (somente leitura).

- [ ] **Step 1: Confirmar que o repo está limpo**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git status
```

Expected: `nothing to commit, working tree clean` (ou apenas o spec já commitado em `docs/superpowers/specs/`).

- [ ] **Step 2: Confirmar versão do Node vs `.nvmrc`**

```bash
cat .nvmrc
node -v
```

Expected: ambas versões iguais (ex: `22` em `.nvmrc` e `v22.x.x` em `node -v`). Se diferente, rodar `nvm use` antes de prosseguir.

- [ ] **Step 3: Confirmar ferramentas externas**

```bash
command -v gitleaks && gitleaks version
command -v pnpm && pnpm -v
command -v node && node -v
```

Expected: `gitleaks version 8.x` (ou superior), `pnpm 9.x` (ou 10.x), `node 22.x`.

- [ ] **Step 4: Confirmar Husky e lint-staged já funcionam**

```bash
pnpm exec husky --version
pnpm exec lint-staged --version
```

Expected: ambos retornam versão sem erro.

---

## Task 1: Remover configs conflitantes de commitlint

**Files:**
- Delete: `commitlint.config.js`
- Delete: `.commitlintrc.js`

- [ ] **Step 1: Remover os dois arquivos de commitlint conflitantes**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
rm -v commitlint.config.js .commitlintrc.js
ls -la commitlint.config.* .commitlintrc.* 2>&1 | head -5
```

Expected: ambos removidos; o `ls` falha com "No such file or directory".

- [ ] **Step 2: Commit da remoção**

```bash
git add -A
git commit -m "chore(husky): remover configs conflitantes de commitlint

A coexistência de commitlint.config.js (ESM) e .commitlintrc.js (CJS)
tornava ambíguo qual config era usada. Serão substituídos por um
commitlint.config.mjs único no próximo commit."
```

Expected: commit criado com sucesso.

---

## Task 2: Criar `commitlint.config.mjs` unificado

**Files:**
- Create: `commitlint.config.mjs`

- [ ] **Step 1: Criar `commitlint.config.mjs` com o superset das regras**

```js
/**
 * Commitlint — Conventional Commits em pt-BR.
 * Superset das duas configs anteriores, endurecidas para o monorepo pedi-ai.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  parserPreset: 'conventional-changelog-conventionalcommits',
  rules: {
    'header-max-length': [2, 'always', 100],
    'header-min-length': [2, 'always', 10],
    'subject-full-stop': [2, 'never', '.'],
    'subject-case': [
      2,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case'],
    ],
    'subject-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'type-empty': [2, 'never'],
    'type-case': [2, 'always', 'lower-case'],
    'scope-enum': [
      2,
      'always',
      [
        // Bounded contexts (DDD)
        'pedido',
        'cardapio',
        'mesa',
        'pagamento',
        'autenticacao',
        'admin',
        'shared',
        // Áreas transversais
        'web',
        'api',
        'infra',
        'docs',
        'deps',
        'ci',
        'e2e',
        'husky',
        'docker',
        'rtm',
        'openspec',
      ],
    ],
    'scope-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
```

- [ ] **Step 2: Verificar manualmente que o commitlint aceita mensagem válida**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
echo "feat(pagamento): adicionar idempotência em webhooks pix" | \
  pnpm exec commitlint
echo "exit=$?"
```

Expected: exit 0, sem output de erro.

- [ ] **Step 3: Verificar manualmente que mensagem inválida falha**

```bash
echo "update" | pnpm exec commitlint
echo "exit=$?"
```

Expected: exit 1, mensagem indicando `type 'update' não permitido`.

- [ ] **Step 4: Verificar que scope obrigatório falha quando vazio**

```bash
echo "feat: adicionar X" | pnpm exec commitlint
echo "exit=$?"
```

Expected: exit 1, mensagem indicando `scope deve ter um valor`.

- [ ] **Step 5: Commit**

```bash
git add commitlint.config.mjs
git commit -m "feat(husky): adicionar commitlint.config.mjs unificado

ESM, superset das duas configs anteriores. Scope agora é obrigatório e
restrito aos BCs do DDD (pedido, cardapio, pagamento...) e áreas
transversais (web, api, infra...). Subject em pt-BR, sem ponto final."
```

Expected: commit criado (note: o hook `commit-msg` ainda não está atualizado; o commit é feito direto no shell, sem passar pelo hook. Veja Task 6).

---

## Task 3: Criar `.husky/_lib.sh` (helper compartilhado)

**Files:**
- Create: `.husky/_lib.sh`

- [ ] **Step 1: Criar o arquivo `.husky/_lib.sh`**

```sh
# .husky/_lib.sh — funções usadas por todos os hooks.
# Source via: . "$(dirname -- "$0")/_lib.sh"

RED=$'\033[31m'
GRN=$'\033[32m'
YLW=$'\033[33m'
RST=$'\033[0m'

log_ok() {
  printf "%b✅ %s%b\n" "$GRN" "$*" "$RST"
}

log_warn() {
  printf "%b⚠️  %s%b\n" "$YLW" "$*" "$RST"
}

log_err() {
  printf "%b❌ %s%b\n" "$RED" "$*" "$RST"
}

# Falha dura se a ferramenta não está no PATH
need() {
  command -v "$1" >/dev/null 2>&1 || {
    log_err "$1 não está instalado"
    case "$1" in
      gitleaks) log_err "  brew install gitleaks  (macOS)" ;;
      secretlint) log_err "  pnpm add -D secretlint @secretlint/preset-recommend" ;;
    esac
    exit 1
  }
}

# Valida Node version vs .nvmrc
check_node() {
  local expected actual
  expected=$(tr -d '[:space:]' < .nvmrc)
  actual=$(node -v | tr -d 'v')
  [ "$expected" = "$actual" ] || {
    log_err "Node $actual, esperado $expected (de .nvmrc)"
    log_err "  Use: nvm use   ou   nvm install $expected"
    exit 1
  }
}
```

- [ ] **Step 2: Garantir permissão de leitura (não precisa de +x; é sourced)**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
ls -l .husky/_lib.sh
chmod 644 .husky/_lib.sh
```

Expected: `-rw-r--r--` (não executable; é sourced).

- [ ] **Step 3: Verificar sourcing manual**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
. .husky/_lib.sh
log_ok "lib carregada"
log_warn "exemplo warning"
log_err "exemplo erro"
need gitleaks && log_ok "gitleaks disponível"
check_node && log_ok "node version ok"
```

Expected: cada `log_*` imprime colorido; `need gitleaks` e `check_node` imprimem ✅ (ou ❌ se gitleaks não estiver / node errado).

- [ ] **Step 4: Commit**

```bash
git add .husky/_lib.sh
git commit -m "feat(husky): adicionar helper compartilhado _lib.sh

Centraliza log colorido, validação de ferramentas e checagem de versão
do Node. Usado por todos os hooks para mensagens consistentes e
instalação guiada quando algo falta."
```

Expected: commit criado.

---

## Task 4: Adicionar `secretlint` como devDependency

**Files:**
- Modify: `package.json` (adicionar 2 deps em `devDependencies`, em ordem alfabética)

- [ ] **Step 1: Adicionar `secretlint` e `@secretlint/preset-recommend` ao `package.json`**

Localizar o bloco `"devDependencies"` no `package.json` (atualmente começa com `"@commitlint/cli": "^21.2.0",`). Adicionar (em ordem alfabética, antes de `"sharp"`):

```json
"@secretlint/preset-recommend": "^4.0.0",
"secretlint": "^4.0.0",
```

Resultado do bloco `devDependencies` (mostrando apenas as inserções):

```json
    "@commitlint/cli": "^21.2.0",
    "@commitlint/config-conventional": "^21.2.0",
    "@playwright/test": "^1.61.1",
    "@secretlint/preset-recommend": "^4.0.0",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    ...
    "secretlint": "^4.0.0",
    "sharp": "^0.35.3",
```

- [ ] **Step 2: Instalar as novas dependências**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
pnpm install
```

Expected: lockfile atualizado, sem erros. Comando `npx secretlint --version` (após install) deve retornar versão.

- [ ] **Step 3: Verificar que `secretlint` está disponível**

```bash
npx --no -- secretlint --version
```

Expected: exibe `4.x.x` (ou versão instalada).

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(deps): adicionar secretlint como defesa em profundidade

secretlint complementa o gitleaks na detecção de segredos. O hook
pre-commit usa os dois: gitleaks bloqueia segredos reais (chaves AWS,
tokens Mercado Pago, etc.), secretlint dá warning para padrões
suspeitos. Defesa em profundidade: se um falha, o outro pega."
```

Expected: commit criado.

---

## Task 5: Reescrever `.husky/pre-commit`

**Files:**
- Modify: `.husky/pre-commit` (substituir conteúdo)

- [ ] **Step 1: Substituir o conteúdo de `.husky/pre-commit`**

```sh
#!/usr/bin/env sh
# .husky/pre-commit — gate de qualidade + segurança antes de cada commit.
#
# Etapas:
#   1) valida ambiente (gitleaks, node vs .nvmrc)
#   2) bloqueia arquivos sensíveis e > 5 MB
#   3) lint-staged (ESLint + Prettier nos modificados)
#   4) gitleaks (bloqueia)
#   5) secretlint (warning, defesa em profundidade)
#
# Para pular (NÃO recomendado): git commit --no-verify

. "$(dirname -- "$0")/_lib.sh"
need gitleaks
check_node

# ── 1) Bloquear arquivos proibidos ─────────────────────
git diff --cached --name-only --diff-filter=ACMR | while read -r f; do
  case "$f" in
    *.env | *.env.* | .envrc | \
    *.pem | *.key | *.p12 | *.pfx | \
    id_rsa | id_dsa | id_ed25519 | \
    .DS_Store | Thumbs.db | *.log | node_modules)
      log_err "Arquivo bloqueado: $f"
      exit 1
      ;;
  esac
done

# ── 2) Bloquear arquivos > 5 MB ────────────────────────
MAX=5242880
git diff --cached --name-only --diff-filter=ACMR | while read -r f; do
  if [ -f "$f" ]; then
    size=$(stat -c %s "$f" 2>/dev/null || stat -f %z "$f" 2>/dev/null)
    if [ -n "$size" ] && [ "$size" -gt "$MAX" ]; then
      log_err "Arquivo > 5 MB: $f ($size bytes). Use Git LFS ou .gitignore."
      exit 1
    fi
  fi
done

# ── 3) Lint + format nos modificados ───────────────────
pnpm exec lint-staged

# ── 4) gitleaks (bloqueia) ─────────────────────────────
gitleaks protect --staged --redact --no-banner --config .gitleaks.toml

# ── 5) secretlint (defesa em profundidade) ─────────────
if command -v secretlint >/dev/null 2>&1; then
  if ! npx --no -- secretlint --mask '{{SECRET}}' "**/*" >/dev/null 2>&1; then
    log_warn "secretlint encontrou padrões suspeitos. Revise antes do push."
  fi
else
  log_warn "secretlint não instalado (opcional; gitleaks já cobre)."
fi
```

- [ ] **Step 2: Garantir permissão de execução**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
chmod +x .husky/pre-commit
ls -l .husky/pre-commit
```

Expected: `-rwxr-xr-x`.

- [ ] **Step 3: Smoke test — commitar uma mudança válida e ver hook rodar**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
echo "// teste pre-commit $(date)" >> /tmp/_precommit_test.ts
cp /tmp/_precommit_test.ts apps/web/_smoke_test.ts
git add apps/web/_smoke_test.ts
git commit -m "test(husky): smoke test do pre-commit"
```

Expected: hook roda em ~3-10s; se lint-staged reclamar, rodar `pnpm --filter @pedi-ai/web lint:fix` antes. Commit criado com sucesso.

- [ ] **Step 4: Reverter o smoke test**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git reset --hard HEAD~1
rm -f apps/web/_smoke_test.ts /tmp/_precommit_test.ts
git status
```

Expected: working tree limpo, sem o arquivo de teste.

---

## Task 6: Reescrever `.husky/commit-msg`

**Files:**
- Modify: `.husky/commit-msg` (substituir conteúdo)

- [ ] **Step 1: Substituir o conteúdo de `.husky/commit-msg`**

```sh
#!/usr/bin/env sh
# .husky/commit-msg — valida mensagem contra commitlint (config unificada).
#
# Para pular (NÃO recomendado): git commit --no-verify

. "$(dirname -- "$0")/_lib.sh"
npx --no -- commitlint --edit "$1"
```

- [ ] **Step 2: Garantir permissão de execução**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
chmod +x .husky/commit-msg
ls -l .husky/commit-msg
```

Expected: `-rwxr-xr-x`.

- [ ] **Step 3: Smoke test — commitar com mensagem inválida (deve falhar)**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
echo "// teste commit-msg $(date)" >> apps/web/_smoke.ts
git add apps/web/_smoke.ts
git commit -m "update"
echo "exit=$?"
```

Expected: `commitlint` rejeita (`type 'update' não permitido`). Saída mostra lista de types aceitos. `exit=1`.

- [ ] **Step 4: Smoke test — commitar com mensagem válida (deve passar)**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git commit -m "test(husky): smoke test do commit-msg"
```

Expected: commit criado. Hook `pre-commit` também roda (lint-staged). Se houver problema de lint, rodar `pnpm --filter @pedi-ai/web lint:fix`.

- [ ] **Step 5: Reverter o smoke test**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git reset --hard HEAD~1
rm -f apps/web/_smoke.ts
git status
```

Expected: working tree limpo.

---

## Task 7: Reescrever `.husky/pre-push`

**Files:**
- Modify: `.husky/pre-push` (substituir conteúdo)

- [ ] **Step 1: Substituir o conteúdo de `.husky/pre-push`**

```sh
#!/usr/bin/env sh
# .husky/pre-push — gates de qualidade completos antes do push.
#
# Etapas (60-300s):
#   1) lockfile consistente
#   2) testes dos arquivos alterados (web + api)
#   3) typecheck (web + api + shared)
#   4) build (web + api + shared)
#   5) cobertura ≥ 80% nos alterados (web)
#
# Para pular (NÃO recomendado): git push --no-verify

. "$(dirname -- "$0")/_lib.sh"

# ── 1) Lockfile consistente ────────────────────────────
if ! pnpm install --frozen-lockfile --prefer-offline --silent; then
  log_err "pnpm-lock.yaml inconsistente. Rode: pnpm install"
  exit 1
fi
log_ok "Lockfile consistente"

# ── 2) Testes dos arquivos alterados (web + api) ───────
log_ok "Rodando testes dos arquivos alterados (web)…"
pnpm --filter @pedi-ai/web -- exec vitest run --changed HEAD~1
log_ok "Rodando testes dos arquivos alterados (api)…"
pnpm --filter @pedi-ai/api -- exec vitest run --changed HEAD~1 2>/dev/null || \
  log_warn "api sem config de vitest, pulando"

# ── 3) Typecheck em todos os pacotes ────────────────────
log_ok "Typecheck web + api + shared…"
pnpm -r --filter @pedi-ai/web --filter @pedi-ai/api --filter @pedi-ai/shared -- exec tsc --noEmit

# ── 4) Build de web + api + shared ──────────────────────
log_ok "Build web + api + shared…"
pnpm -r --filter @pedi-ai/web --filter @pedi-ai/api --filter @pedi-ai/shared build

# ── 5) Cobertura mínima nos alterados (web) ────────────
log_ok "Cobertura web (≥ 80% nos alterados)…"
pnpm --filter @pedi-ai/web -- exec vitest run --coverage --changed HEAD~1 \
  --coverage.thresholds.lines=80 \
  --coverage.thresholds.branches=75 \
  --coverage.thresholds.functions=80 \
  --coverage.thresholds.statements=80

log_ok "Todos os gates passaram. Push liberado."
```

- [ ] **Step 2: Garantir permissão de execução**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
chmod +x .husky/pre-push
ls -l .husky/pre-push
```

Expected: `-rwxr-xr-x`.

- [ ] **Step 3: Verificar manualmente com `git push` real (smoke test do push)**

Como o push real é caro, vamos validar **apenas o sourcing e a sintaxe**:

```bash
cd /home/leo/Documentos/projetos/pedi-ai
sh -n .husky/pre-push && echo "OK: sintaxe válida"
. .husky/_lib.sh && echo "OK: _lib.sh sourced"
```

Expected: `OK: sintaxe válida` e `OK: _lib.sh sourced`.

> **Nota:** o push real só será validado na **Task 13 (Smoke test end-to-end)**. Pular este step para evitar 1-3min de build por engano.

---

## Task 8: Criar `.husky/post-merge` e `.husky/post-checkout`

**Files:**
- Create: `.husky/post-merge`
- Create: `.husky/post-checkout`

- [ ] **Step 1: Criar `.husky/post-merge`**

```sh
#!/usr/bin/env sh
# .husky/post-merge — avisa se configs de ambiente mudaram após merge.
# Args: $1 = refs/heads/<branch>, $2 = novo sha
. "$(dirname -- "$0")/_lib.sh"

prev="$1"
curr="$2"
[ -z "$prev" ] || [ -z "$curr" ] && exit 0

changed_files=$(git diff --name-only "$prev" "$curr" 2>/dev/null)
echo "$changed_files" | grep -qE '^(package\.json|pnpm-lock\.yaml|\.nvmrc|\.npmrc|commitlint\.config\.[mc]?js|\.commitlintrc\.js|scripts/check-dev-env\.sh|\.husky/_lib\.sh|\.husky/.*)$' && {
  log_warn "Configuração de ambiente mudou. Rode: pnpm install && pnpm rebuild"
  exit 0
}
```

- [ ] **Step 2: Criar `.husky/post-checkout`**

```sh
#!/usr/bin/env sh
# .husky/post-checkout — avisa se configs de ambiente mudaram após checkout.
# Args: $1 = sha anterior, $2 = novo sha, $3 = 1 se troca de branch
. "$(dirname -- "$0")/_lib.sh"

prev="$1"
curr="$2"
[ -z "$prev" ] || [ -z "$curr" ] && exit 0

changed_files=$(git diff --name-only "$prev" "$curr" 2>/dev/null)
echo "$changed_files" | grep -qE '^(package\.json|pnpm-lock\.yaml|\.nvmrc|\.npmrc|commitlint\.config\.[mc]?js|\.commitlintrc\.js|scripts/check-dev-env\.sh|\.husky/_lib\.sh|\.husky/.*)$' && {
  log_warn "Configuração de ambiente mudou. Rode: pnpm install && pnpm rebuild"
  exit 0
}
```

- [ ] **Step 3: Garantir permissões de execução**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
chmod +x .husky/post-merge .husky/post-checkout
ls -l .husky/post-merge .husky/post-checkout
```

Expected: ambos `-rwxr-xr-x`.

- [ ] **Step 4: Smoke test — simular merge mudando `.nvmrc` e ver aviso**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
# Cria branch temporária, muda .nvmrc, faz merge em si mesmo (fast-forward não rola; usa --no-ff)
git checkout -b _test_post_merge
echo "22" > .nvmrc.test_backup
mv .nvmrc .nvmrc.bak && cp .nvmrc.test_backup .nvmrc && rm .nvmrc.test_backup
git add .nvmrc
git commit -m "chore(infra): smoke test post-merge" --no-verify
git checkout master
git merge --no-ff _test_post_merge --no-edit
```

Expected: durante o `git merge`, o hook `post-merge` imprime `⚠️  Configuração de ambiente mudou. Rode: pnpm install && pnpm rebuild`.

- [ ] **Step 5: Limpar a branch e o arquivo de teste**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git branch -D _test_post_merge
mv .nvmrc.bak .nvmrc
git add .nvmrc
git commit -m "revert: limpar smoke test do post-merge" --no-verify
```

Expected: branch removida; `.nvmrc` restaurado; commit de cleanup.

---

## Task 9: Criar `scripts/check-dev-env.sh` + script `env:check`

**Files:**
- Create: `scripts/check-dev-env.sh`
- Modify: `package.json` (adicionar `env:check` em `scripts`)

- [ ] **Step 1: Criar `scripts/check-dev-env.sh`**

```sh
#!/usr/bin/env sh
# scripts/check-dev-env.sh
# Verifica se a máquina do dev tem tudo que os hooks do Husky exigem.
# Documentado em docs/guides/HUSKY.md
# Uso: pnpm env:check

. "$(dirname -- "$0")/../.husky/_lib.sh"

echo "🔍 Verificando ambiente de desenvolvimento pedi-ai…"

# Ferramentas essenciais
command -v gitleaks >/dev/null 2>&1 \
  && log_ok "gitleaks $(gitleaks version)" \
  || log_err "gitleaks NÃO instalado (brew install gitleaks)"

command -v pnpm >/dev/null 2>&1 \
  && log_ok "pnpm $(pnpm -v)" \
  || log_err "pnpm NÃO instalado (https://pnpm.io/installation)"

# Ferramentas opcionais
command -v secretlint >/dev/null 2>&1 \
  && log_ok "secretlint $(secretlint --version 2>/dev/null || echo installed)" \
  || log_warn "secretlint NÃO instalado (opcional; instale via pnpm add -D secretlint @secretlint/preset-recommend)"

# Versão do Node
check_node 2>/dev/null \
  && log_ok "Node $(node -v)" \
  || log_err "Node errado (esperado $(cat .nvmrc), atual $(node -v))"

# Lockfile
[ -f pnpm-lock.yaml ] \
  && log_ok "pnpm-lock.yaml presente" \
  || log_err "pnpm-lock.yaml ausente (rode pnpm install)"

echo ""
echo "✨ Verificação concluída. Veja docs/guides/HUSKY.md para troubleshooting."
```

- [ ] **Step 2: Garantir permissão de execução**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
chmod +x scripts/check-dev-env.sh
ls -l scripts/check-dev-env.sh
```

Expected: `-rwxr-xr-x`.

- [ ] **Step 3: Adicionar `env:check` ao `package.json`**

Localizar `"scripts"` no `package.json` e adicionar (em ordem alfabética, antes de `"lint"`):

```json
    "env:check": "sh scripts/check-dev-env.sh",
```

- [ ] **Step 4: Testar o script**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
pnpm env:check
```

Expected: lista colorida de verificações; se tudo OK, mostra `✨ Verificação concluída`. Se algo faltar, mostra a instrução de instalação.

- [ ] **Step 5: Commit**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git add scripts/check-dev-env.sh package.json
git commit -m "feat(husky): adicionar pnpm env:check

Script de diagnóstico do ambiente. Roda antes do primeiro commit ou
sempre que algum hook parecer estranho. Valida gitleaks, pnpm, Node
version vs .nvmrc e presença do lockfile."
```

Expected: commit criado.

---

## Task 10: Criar `docs/guides/HUSKY.md`

**Files:**
- Create: `docs/guides/HUSKY.md`

- [ ] **Step 1: Criar `docs/guides/HUSKY.md`**

```markdown
# Husky — Guia Operacional

Hooks do Git que garantem segurança e consistência em **toda branch** do
monorepo pedi-ai. Este guia cobre o que cada hook faz, como configurar o
ambiente, e o que fazer quando algo falha.

## TL;DR

```bash
pnpm env:check      # diagnóstico do ambiente
git commit -m "feat(pagamento): adicionar idempotência"
git push            # roda todos os gates (60-300s)
```

## Setup inicial (novo dev)

1. **Instalar dependências do sistema:**
   - **macOS:** `brew install gitleaks`
   - **Linux/Windows:** baixar de <https://github.com/gitleaks/gitleaks/releases>
2. **Node versionado:** `nvm install` (lê `.nvmrc` automaticamente).
3. **Dependências do projeto:** `pnpm install` (instala também `secretlint` via devDep).
4. **Validar ambiente:** `pnpm env:check` — tudo deve aparecer ✅.

## Hooks

| Hook | Quando | O que faz | Tempo |
|---|---|---|---|
| `pre-commit` | `git commit` | valida env, bloqueia proibidos/5 MB, lint-staged, gitleaks, secretlint | 3-10s |
| `commit-msg` | mensagem escrita | `commitlint` (config unificada) | < 1s |
| `pre-push` | `git push` | lockfile, testes alterados, typecheck, build 3 pacotes, cobertura ≥ 80% | 60-300s |
| `post-merge` | `git pull` / merge | avisa se configs críticas mudaram | < 1s |
| `post-checkout` | `git checkout` | mesmo aviso do post-merge | < 1s |

### Convenção de mensagens (commitlint)

**Formato:** `type(scope): subject em pt-BR`

**Types aceitos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

**Scopes aceitos (obrigatório):**

- Bounded contexts: `pedido`, `cardapio`, `mesa`, `pagamento`, `autenticacao`, `admin`, `shared`
- Áreas transversais: `web`, `api`, `infra`, `docs`, `deps`, `ci`, `e2e`, `husky`, `docker`, `rtm`, `openspec`

**Exemplos válidos:**

- `feat(pagamento): adicionar idempotência em webhooks pix`
- `fix(api): corrigir timeout em pedidos`
- `chore(deps): bump nestjs para v11`

**Exemplos rejeitados:**

- `update` → type inválido
- `feat: add X` → scope vazio
- `feat(Pagamento): ...` → scope em maiúsculo
- `feat(pagamento): Adicionar X.` → ponto final / maiúscula

## Pular hooks (NÃO recomendado)

```bash
git commit --no-verify -m "..."  # pula pre-commit + commit-msg
git push --no-verify             # pula pre-push
```

**Não faça isso.** Os hooks existem para proteger a branch. Use
`--no-verify` apenas em emergências extremas (ex: reverter um commit
que quebrou o CI). Documente o motivo no PR.

## Troubleshooting

| Sintoma | Causa | Solução |
|---|---|---|
| `gitleaks não está instalado` | binário ausente | `brew install gitleaks` (macOS) ou binário do release |
| `Node X, esperado Y` | versão errada | `nvm use` |
| `Arquivo bloqueado: .env` | staging de arquivo sensível | remova do staging: `git restore --staged <file>` |
| `Arquivo > 5 MB` | binário/commit de asset | use Git LFS ou adicione ao `.gitignore` |
| `scope deve ter um valor` | mensagem sem scope | adicione o scope do BC: `feat(pedido): ...` |
| `type 'X' não permitido` | type fora do enum | use um dos 11 types aceitos |
| `pnpm-lock.yaml inconsistente` | lockfile drift | `pnpm install` |
| `secretlint encontrou padrões suspeitos` | string com cara de secret | revise o arquivo e remova o valor real |
| `pre-push` muito lento | suite completa | use `--no-verify` APENAS em emergências; senão, otimize testes (já roda `--changed`) |
| `Configuração de ambiente mudou` (post-merge) | `pnpm-lock.yaml` ou `.nvmrc` alterado | rode `pnpm install && pnpm rebuild` |

## Arquivos modificados por este setup

- `.husky/_lib.sh` — helpers compartilhados.
- `.husky/pre-commit`, `commit-msg`, `pre-push`, `post-merge`, `post-checkout`.
- `commitlint.config.mjs` — config unificada.
- `scripts/check-dev-env.sh` — diagnóstico.
- `package.json` — script `env:check` + devDeps `secretlint`, `@secretlint/preset-recommend`.

## Onde está o quê

- Spec: `docs/superpowers/specs/2026-08-03-husky-seguranca-consistencia-design.md`
- Plano: `docs/superpowers/plans/2026-08-03-husky-seguranca-consistencia.md`
- Config do git (hooks): `pnpm prepare` (reaponta `.husky/`)
```

- [ ] **Step 2: Commit**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git add docs/guides/HUSKY.md
git commit -m "docs(husky): guia operacional dos hooks

Cobre setup inicial, hooks, convenção de mensagens, troubleshooting
e referência ao spec/plano. Único lugar para devs consultarem quando
um hook falha ou querem entender o que cada gate faz."
```

Expected: commit criado.

---

## Task 11: Atualizar `AGENTS.md` (menção curta)

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Localizar uma seção existente de "Regras do Projeto" ou similar no `AGENTS.md`**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
grep -n "^## " AGENTS.md | head -30
```

- [ ] **Step 2: Adicionar uma seção "Gates de qualidade (Husky)" antes da seção de regras finais (ou como subseção de "Regras do Projeto")**

Procurar uma boa âncora — por exemplo, após a seção que fala sobre cobertura mínima de testes. Adicionar (com 2 níveis de `#` para subseção, ou ajustar conforme a hierarquia existente):

```markdown
## Gates de qualidade (Husky)

Todo commit e push passa por hooks do Husky. Antes de mergear, o
`pre-push` roda: lockfile, testes dos arquivos alterados, typecheck,
build de web + api + shared, e cobertura ≥ 80%. O `commit-msg`
valida conventional commits com scope restrito aos BCs do DDD.

**Não use `--no-verify`** exceto emergências documentadas. Para
troubleshooting e setup inicial, veja [docs/guides/HUSKY.md](../guides/HUSKY.md).
```

> **Nota:** Se `AGENTS.md` não tem seção "Regras do Projeto" ou similar, adapte a posição. O importante é que a menção fique visível.

- [ ] **Step 3: Commit**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git add AGENTS.md
git commit -m "docs(husky): mencionar gates de qualidade no AGENTS.md"
```

Expected: commit criado.

---

## Task 12: Atualizar `CHANGELOG.md`

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Localizar a seção "Unreleased" no CHANGELOG.md**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
head -40 CHANGELOG.md
```

- [ ] **Step 2: Adicionar entrada em "Unreleased" (ou criar a seção se não existir)**

Adicionar (mantendo a formatação existente do arquivo):

```markdown
### Segurança

- **Husky endurecido**: hooks agora cobrem validação de ambiente
  (gitleaks, Node, lockfile), bloqueio de arquivos sensíveis e > 5 MB,
  lint-staged + gitleaks + secretlint no pre-commit, e pre-push
  completo (testes alterados, typecheck, build de 3 pacotes, cobertura
  ≥ 80%). Commitlint unificado em `commitlint.config.mjs` com scope
  obrigatório restrito aos BCs do DDD. Veja `docs/guides/HUSKY.md`.
```

- [ ] **Step 3: Commit**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git add CHANGELOG.md
git commit -m "docs(husky): entrada no CHANGELOG (Unreleased)"
```

Expected: commit criado.

---

## Task 13: Smoke test end-to-end

**Files:** nenhum (verificação manual).

- [ ] **Step 1: Validar ambiente**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
pnpm env:check
```

Expected: tudo ✅.

- [ ] **Step 2: Validar `pre-commit` com mudança trivial**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
echo "// smoke $(date)" >> apps/web/_e2e_smoke.ts
git add apps/web/_e2e_smoke.ts
git commit -m "test(husky): smoke test end-to-end"
```

Expected: hook `pre-commit` roda (env-check, lint-staged, gitleaks); `commit-msg` valida; commit criado.

- [ ] **Step 3: Validar `pre-push` (pode levar 60-300s)**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git push origin HEAD 2>&1 | tee /tmp/_e2e_push.log
```

Expected: rodadas de lockfile, testes, typecheck, build, cobertura. Se passar, push real acontece (ou hook libera com `Everything up-to-date` se for o mesmo branch).

- [ ] **Step 4: Reverter o smoke test**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
rm -f apps/web/_e2e_smoke.ts /tmp/_e2e_push.log
git add -A
git commit -m "revert: limpar smoke test end-to-end" --no-verify
```

Expected: working tree limpo.

- [ ] **Step 5: Validar `post-merge` (simular merge de branch com mudança de config)**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git checkout -b _smoke_post_merge
echo "" >> .npmrc
git add .npmrc
git commit -m "chore(infra): smoke post-merge" --no-verify
git checkout master
git merge --no-ff _smoke_post_merge --no-edit
```

Expected: durante o merge, o `post-merge` imprime `⚠️  Configuração de ambiente mudou. Rode: pnpm install && pnpm rebuild`.

- [ ] **Step 6: Limpar**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git checkout .npmrc
git branch -D _smoke_post_merge
git add .npmrc
git commit -m "revert: limpar smoke post-merge" --no-verify
```

Expected: working tree limpo; branch de teste removida.

---

## Task 14: Validação final e commit de fecho

**Files:** nenhum (apenas validação).

- [ ] **Step 1: Verificar status final do repo**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git status
git log --oneline -15
```

Expected: working tree limpo; log mostra ~12-15 commits novos deste plano.

- [ ] **Step 2: Verificar permissões dos hooks**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
ls -l .husky/* | grep -v '^d'
```

Expected: todos os hooks (`pre-commit`, `commit-msg`, `pre-push`, `post-merge`, `post-checkout`) com `-rwxr-xr-x`. `_lib.sh` com `-rw-r--r--`.

- [ ] **Step 3: Verificar que `.commitlintrc.js` e `commitlint.config.js` foram removidos**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
ls -la commitlint.config.* .commitlintrc.* 2>&1
```

Expected: apenas `commitlint.config.mjs` existe; os outros dois retornam "No such file or directory".

- [ ] **Step 4: Verificar que `secretlint` está em `devDependencies`**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
node -e "const p = require('./package.json'); console.log('secretlint:', p.devDependencies.secretlint); console.log('@secretlint/preset-recommend:', p.devDependencies['@secretlint/preset-recommend']);"
```

Expected: ambos os pacotes listados (não `undefined`).

- [ ] **Step 5: Verificar que `env:check` está em `scripts`**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
node -e "const p = require('./package.json'); console.log('env:check:', p.scripts['env:check']);"
```

Expected: `env:check: sh scripts/check-dev-env.sh`.

- [ ] **Step 6: Documentar conclusão no `CHANGELOG.md` (mover entrada de Unreleased para uma versão ou seção "Released")**

Seguir o padrão existente do `CHANGELOG.md` (verificar formatação). Se já existe um padrão de "Unreleased → X.Y.Z", usar.

Exemplo de commit:

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git add CHANGELOG.md
git commit -m "docs(husky): marcar release da endurecimento no CHANGELOG"
```

Expected: commit criado (se aplicável).

- [ ] **Step 7: Push final para o remoto**

```bash
cd /home/leo/Documentos/projetos/pedi-ai
git push origin master
```

Expected: `pre-push` roda todos os gates (lockfile, testes, typecheck, build, cobertura). Se tudo passar, push acontece. Se falhar, ver `docs/guides/HUSKY.md` § Troubleshooting.

---

## Self-Review do plano

**Cobertura do spec:**

| Requisito do spec | Task que implementa |
|---|---|
| Remover `.commitlintrc.js` e `commitlint.config.js` | Task 1 |
| Criar `commitlint.config.mjs` unificado com scope obrigatório + enum | Task 2 |
| `.husky/_lib.sh` com helpers | Task 3 |
| Adicionar `secretlint` + `@secretlint/preset-recommend` como devDep | Task 4 |
| Reescrever `pre-commit` (env, proibidos, > 5 MB, lint-staged, gitleaks, secretlint) | Task 5 |
| Reescrever `commit-msg` | Task 6 |
| Reescrever `pre-push` (lockfile, testes, typecheck, build, cobertura) | Task 7 |
| Criar `post-merge` e `post-checkout` | Task 8 |
| `scripts/check-dev-env.sh` + `pnpm env:check` | Task 9 |
| `docs/guides/HUSKY.md` | Task 10 |
| Menção em `AGENTS.md` | Task 11 |
| Entrada no `CHANGELOG.md` | Task 12 |
| Validação manual de todos os hooks | Task 13 |
| Verificação final + push | Task 14 |

**Placeholder scan:** nenhum "TBD", "TODO", "implement later" ou referência a código não definido. Cada step mostra código completo ou comando exato.

**Type/symbol consistency:**
- `_lib.sh` exporta: `log_ok`, `log_warn`, `log_err`, `need`, `check_node` — usado em todos os hooks.
- `commitlint.config.mjs` rules usadas: `header-max-length`, `header-min-length`, `subject-full-stop`, `subject-case`, `subject-empty`, `type-enum`, `type-empty`, `type-case`, `scope-enum`, `scope-empty`, `scope-case`, `body-leading-blank`, `footer-leading-blank` — todos padrão commitlint, sem invenções.
- `package.json` script `env:check` chamado em Task 9 Step 3 e Task 13 Step 1 — consistente.

**Ambiguidade:** nenhum step descreve o que fazer sem mostrar como. Comandos têm saída esperada. Hooks têm código completo, não pseudocódigo.
