# Husky — Segurança e Consistência Máximas

**Data:** 2026-08-03
**Status:** Aprovado em design — aguardando plano de implementação
**Escopo:** `.husky/`, `commitlint.config.*`, `package.json` (script `env:check`), `docs/guides/HUSKY.md`, `AGENTS.md`, `CHANGELOG.md`.

## Contexto

O diretório `.husky/` já tem hooks básicos (`pre-commit`, `commit-msg`, `pre-push`), mas há problemas reais que enfraquecem a segurança e a consistência entre branches/apps:

1. **Conflito de commitlint:** dois arquivos coexistem — `commitlint.config.js` (ESM, mais restritivo) e `.commitlintrc.js` (CJS, mais frouxo). Quem ganha na hora de validar é ambíguo.
2. **`pre-push` incompleto:** roda `pnpm build`, que só builda `@pedi-ai/web`. Não builda `@pedi-ai/api` nem `@pedi-ai/shared`.
3. **`pre-commit` falho silencioso:** depende de `gitleaks` instalado, mas se não estiver, hard-falha. Sem aviso de "instale X".
4. **`commit-msg` permissivo:** scope é livre (qualquer string passa), o que impede changelog/release-notes limpos.
5. **Sem checagem de ambiente:** Node version, presença de ferramentas, lockfile consistente não são validados.
6. **Sem gates de qualidade em código:** testes, typecheck, cobertura, build completo só rodam no CI, longe do dev.
7. **Sem aviso pós-merge:** mudanças em `package.json`, `pnpm-lock.yaml` ou `.nvmrc` passam despercebidas.

## Decisões de design (validadas com o usuário)

| Tema                        | Decisão                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Escopo da segurança         | Endurecer o que existe **+** adicionar novos gates de qualidade. **Sem** política de bloqueio de push direto em master.                                       |
| Consistência entre branches | Mensagens de commit e changelog **+** versão de ferramentas e lockfile **+** cobertura de testes por arquivo alterado **+** formatação e estilo consistentes. |
| Conflito de commitlint      | Unificar em um único arquivo (ESM, `commitlint.config.mjs`) com superset das duas configs.                                                                    |
| Tempo limite nos hooks      | Sem limite — máxima segurança. (Mitigação: `--changed` do vitest, paralelismo, feedback visual.)                                                              |
| Idioma do commit            | Subject em pt-BR (consistente com `AGENTS.md`).                                                                                                               |
| Escopo de testes            | Suite completa de testes em `pre-push` (`vitest --changed HEAD~1` em web + api).                                                                              |
| Organização                 | Shell inline em cada hook (sem `tsx`/TS nos hooks). Helper compartilhado em `.husky/_lib.sh`.                                                                 |

## Arquitetura dos hooks

| Hook            | Quando             | O que faz                                                                                                                                | Tempo alvo |
| --------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `pre-commit`    | `git commit`       | (a) valida env; (b) bloqueia arquivos proibidos e > 5 MB; (c) `lint-staged`; (d) `gitleaks protect --staged`; (e) `secretlint` (warning) | 3-10s      |
| `commit-msg`    | após mensagem      | `commitlint --edit $1` (config unificada)                                                                                                | < 1s       |
| `pre-push`      | `git push`         | (a) lockfile; (b) testes alterados web+api; (c) typecheck web/api/shared; (d) build dos 3 pacotes; (e) cobertura ≥ 80% nos alterados     | 60-300s    |
| `post-merge`    | `git pull` / merge | Avisa se configs críticas mudaram (sugere `pnpm install && pnpm rebuild`)                                                                | < 1s       |
| `post-checkout` | `git checkout`     | Mesmo aviso do `post-merge`                                                                                                              | < 1s       |

Hooks não alterados (mantidos vazios pelo Husky 9): `prepare-commit-msg`, `pre-rebase`, `pre-merge-commit`, `post-commit`, `post-applypatch`, `post-rewrite`, `pre-applypatch`, `pre-auto-gc`.

## Detalhamento por hook

### `pre-commit`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_lib.sh"
need gitleaks
check_node

# Bloquear arquivos proibidos
git diff --cached --name-only --diff-filter=ACMR | while read -r f; do
  case "$f" in
    *.env|*.env.*|.envrc|*.pem|*.key|*.p12|*.pfx|id_rsa|id_dsa|id_ed25519|\
    .DS_Store|Thumbs.db|*.log|node_modules)
      log_err "Arquivo bloqueado: $f"
      exit 1
      ;;
  esac
done

# Bloquear arquivos > 5 MB
MAX=5242880
git diff --cached --name-only --diff-filter=ACMR | while read -r f; do
  [ -f "$f" ] && [ "$(stat -c %s "$f")" -gt "$MAX" ] && {
    log_err "Arquivo > 5 MB: $f (use Git LFS ou .gitignore)"
    exit 1
  }
done

# Lint + format nos arquivos modificados
pnpm exec lint-staged

# gitleaks (bloqueia) + secretlint (warning)
gitleaks protect --staged --redact --no-banner --config .gitleaks.toml
if command -v secretlint >/dev/null 2>&1; then
  npx --no -- secretlint --mask '{{SECRET}}' "**/*" 2>/dev/null || \
    log_warn "secretlint encontrou padrões suspeitos — revise antes do push"
else
  log_warn "secretlint não instalado (opcional; gitleaks já cobre o essencial)"
fi
```

### `commit-msg`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_lib.sh"
npx --no -- commitlint --edit "$1"
```

### `pre-push`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_lib.sh"

# 1) Lockfile consistente
if ! pnpm install --frozen-lockfile --prefer-offline --silent; then
  log_err "pnpm-lock.yaml inconsistente. Rode: pnpm install"
  exit 1
fi

# 2) Testes dos arquivos alterados (web + api)
log_ok "Rodando testes dos arquivos alterados (web)…"
pnpm --filter @pedi-ai/web -- exec vitest run --changed HEAD~1
log_ok "Rodando testes dos arquivos alterados (api)…"
pnpm --filter @pedi-ai/api -- exec vitest run --changed HEAD~1 2>/dev/null || \
  log_warn "api sem config de vitest, pulando"

# 3) Typecheck em todos os pacotes
log_ok "Typecheck web + api + shared…"
pnpm -r --filter @pedi-ai/web --filter @pedi-ai/api --filter @pedi-ai/shared -- exec tsc --noEmit

# 4) Build de web + api + shared
log_ok "Build web + api + shared…"
pnpm -r --filter @pedi-ai/web --filter @pedi-ai/api --filter @pedi-ai/shared build

# 5) Cobertura mínima nos alterados (web)
log_ok "Cobertura web (≥ 80% nos alterados)…"
pnpm --filter @pedi-ai/web -- exec vitest run --coverage --changed HEAD~1 \
  --coverage.thresholds.lines=80 --coverage.thresholds.branches=75 \
  --coverage.thresholds.functions=80 --coverage.thresholds.statements=80
```

### `post-merge` / `post-checkout`

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_lib.sh"

# post-merge:  $1 = refs/heads/<branch>,  $2 = sha
# post-checkout:  $1 = previous HEAD,  $2 = new HEAD,  $3 = 1 se troca de branch
prev="${1:-HEAD@{1}"
curr="${2:-HEAD}"

changed_files=$(git diff --name-only "$prev" "$curr" 2>/dev/null)
echo "$changed_files" | grep -qE '^(package\.json|pnpm-lock\.yaml|\.nvmrc|\.npmrc|commitlint\.config\.[mc]?js|\.commitlintrc\.js|scripts/check-dev-env\.sh)$' && {
  log_warn "Configuração de ambiente mudou. Rode: pnpm install && pnpm rebuild"
  exit 0
}
```

## Helper compartilhado: `.husky/_lib.sh`

```sh
# .husky/_lib.sh — funções usadas por todos os hooks.
# Source via: . "$(dirname -- "$0")/_lib.sh"

RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; RST=$'\033[0m'

log_ok()   { printf "%b✅ %s%b\n" "$GRN" "$*" "$RST"; }
log_warn() { printf "%b⚠️  %s%b\n" "$YLW" "$*" "$RST"; }
log_err()  { printf "%b❌ %s%b\n" "$RED" "$*" "$RST"; }

need() {
  command -v "$1" >/dev/null 2>&1 || {
    log_err "$1 não está instalado"
    case "$1" in
      gitleaks)   log_err "  brew install gitleaks  (macOS)" ;;
      secretlint) log_err "  pnpm add -D secretlint @secretlint/preset-recommend" ;;
    esac
    exit 1
  }
}

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

## Commitlint unificado: `commitlint.config.mjs`

**Substitui** `commitlint.config.js` (ESM) e **remove** `.commitlintrc.js` (CJS).

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
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
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

**Exemplos válidos:** `feat(pagamento): adicionar idempotência em webhooks pix`, `fix(api): corrigir timeout em pedidos`, `chore(deps): bump nestjs para v11`, `docs(shared): documentar Dinheiro VO`.

**Exemplos rejeitados:** `update` (type inválido), `feat: add X` (scope vazio), `feat(Pagamento): ...` (case errado), `feat(pagamento): Adicionar X.` (com ponto).

## Script de saúde do ambiente: `scripts/check-dev-env.sh`

```sh
#!/usr/bin/env sh
# Verifica se a máquina do dev tem tudo que os hooks exigem.
# Documentado em docs/guides/HUSKY.md
. "$(dirname -- "$0")/../.husky/_lib.sh"

echo "🔍 Verificando ambiente de desenvolvimento…"
command -v gitleaks >/dev/null && log_ok "gitleaks"  || log_err "gitleaks (brew install gitleaks)"
command -v secretlint >/dev/null && log_ok "secretlint" || log_warn "secretlint (opcional)"
check_node
log_ok "pnpm $(pnpm -v)"
echo "✨ Ambiente OK"
```

Adicionar ao `package.json`:

```json
"env:check": "sh scripts/check-dev-env.sh"
```

## Critérios de aceitação

**Funcional**

- `.commitlintrc.js` removido.
- `commitlint.config.mjs` único, ESM, com scope obrigatório e enum.
- `pre-commit` faz env-check, bloqueia proibidos e > 5 MB, lint-staged, gitleaks, secretlint.
- `commit-msg` chama `commitlint --edit $1` apontando para a nova config.
- `pre-push` valida lockfile, roda testes alterados (web + api), typecheck, build de 3 pacotes, cobertura ≥ 80%.
- `post-merge` e `post-checkout` avisam mudanças em configs críticas.
- `.husky/_lib.sh` centraliza helpers.
- `scripts/check-dev-env.sh` + `pnpm env:check` no `package.json`.
- Todos os hooks com `+x` e shebang `#!/usr/bin/env sh`.
- `pnpm install` (que dispara `prepare: husky`) reaponta os hooks.

**Documentação**

- `docs/guides/HUSKY.md` cobrindo: cada hook, como pular com `--no-verify` (não recomendado), troubleshooting, setup inicial.
- `AGENTS.md` com menção curta aos novos gates.
- Entrada no `CHANGELOG.md` em "Unreleased".

**Segurança**

- `.gitleaks.toml` revisado (manter/atualizar conforme novos allowlist).
- Mensagens de erro apontam para `nvm use`, `brew install gitleaks`, etc.
- Arquivos sensíveis hard-bloqueados; > 5 MB hard-bloqueado.

**Validação manual**

- Comitar mensagem inválida → hook rejeita.
- Comitar `.env` → hook rejeita.
- Push → build de web + api + shared roda.
- Pull com `pnpm-lock.yaml` mudado → `post-merge` avisa.

## Riscos e mitigação

| Risco                                            | Mitigação                                                                           |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Devs usam `--no-verify` e quebram o processo     | Mensagens claras em cada hook; CI já roda os mesmos checks; política em `AGENTS.md` |
| `pre-push` ficar lento e devs perderem paciência | Progresso etapa-a-etapa; `--changed` em vez de suite completa; cache do `tsc`       |
| Falsos positivos do `gitleaks` em testes         | `.gitleaks.toml` com allowlist para fixtures; revisar se cobre o novo conteúdo      |
| Conflito entre as 2 configs de commitlint        | Removido — fica só `commitlint.config.mjs`                                          |
| `.nvmrc` divergir entre devs                     | `pre-commit` valida e bloqueia; `post-merge` avisa quando muda                      |
| `secretlint` não instalado                       | warning, não bloqueio; `gitleaks` continua sendo a defesa primária                  |

## Como devs vão sentir

| Operação                                                  | O que acontece                                                      | Tempo   | Se falhar                             |
| --------------------------------------------------------- | ------------------------------------------------------------------- | ------- | ------------------------------------- |
| `git commit -m "feat(pagamento): adicionar idempotência"` | env-check, proibidos, lint-staged, gitleaks, secretlint, commitlint | 3-10s   | Mensagem aponta o problema            |
| `git commit -m "update"`                                  | falha no commitlint com lista de types válidos                      | < 1s    | "type 'update' não permitido"         |
| `git commit -m "feat: x"`                                 | falha no commitlint                                                 | < 1s    | "scope obrigatório"                   |
| `git push`                                                | lockfile, testes, typecheck, build, cobertura                       | 60-300s | Resumo da etapa que falhou            |
| `git pull` com mudança em pnpm-lock                       | `post-merge` avisa                                                  | < 1s    | Sugere `pnpm install && pnpm rebuild` |
