# Guia Husky — Pedi-AI

Hooks do Git que garantem segurança e consistência em **toda branch** do
monorepo pedi-ai (Next.js web + NestJS api + packages/shared). Este guia
cobre o que cada hook faz, como configurar o ambiente, e o que fazer
quando algo falha.

---

## 1. TL;DR

```bash
pnpm env:check                       # diagnóstico do ambiente
git commit -m "feat(pagamento): adicionar idempotência"
git push                             # roda todos os gates (60-300s)
```

---

## 2. Setup Inicial (novo dev)

1. **Instalar dependências do sistema:**
   - **macOS:** `brew install gitleaks`
   - **Linux/Windows:** baixar de <https://github.com/gitleaks/gitleaks/releases>
2. **Node versionado:** `nvm install` (lê `.nvmrc` automaticamente).
3. **Dependências do projeto:** `pnpm install` (instala também `secretlint` via devDep).
4. **Validar ambiente:** `pnpm env:check` — tudo deve aparecer ✅.

---

## 3. Hooks

| Hook            | Quando             | O que faz                                                               | Tempo   |
| --------------- | ------------------ | ----------------------------------------------------------------------- | ------- |
| `pre-commit`    | `git commit`       | valida env, bloqueia proibidos/5 MB, lint-staged, gitleaks, secretlint  | 3-10s   |
| `commit-msg`    | mensagem escrita   | `commitlint` (config unificada em `commitlint.config.mjs`)              | < 1s    |
| `pre-push`      | `git push`         | lockfile, testes alterados, typecheck, build 3 pacotes, cobertura ≥ 80% | 60-300s |
| `post-merge`    | `git pull` / merge | avisa se configs críticas mudaram                                       | < 1s    |
| `post-checkout` | `git checkout`     | mesmo aviso do post-merge                                               | < 1s    |

### 3.1. Convenção de mensagens (commitlint)

**Formato:** `type(scope): subject em pt-BR`

**Types aceitos:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`,
`test`, `build`, `ci`, `chore`, `revert`.

**Scopes aceitos (obrigatório):**

- **Bounded contexts (DDD):** `pedido`, `cardapio`, `mesa`, `pagamento`,
  `autenticacao`, `admin`, `shared`.
- **Áreas transversais:** `web`, `api`, `infra`, `docs`, `deps`, `ci`,
  `e2e`, `husky`, `docker`, `rtm`, `openspec`.

**Exemplos válidos:**

- `feat(pagamento): adicionar idempotência em webhooks pix`
- `fix(api): corrigir timeout em pedidos`
- `chore(deps): bump nestjs para v11`

**Exemplos rejeitados:**

- `update` → type inválido
- `feat: add X` → scope vazio
- `feat(Pagamento): ...` → scope em maiúsculo
- `feat(pagamento): Adicionar X.` → ponto final / maiúscula

---

## 4. Pular Hooks (NÃO recomendado)

```bash
git commit --no-verify -m "..."  # pula pre-commit + commit-msg
git push --no-verify             # pula pre-push
```

**Não faça isso.** Os hooks existem para proteger a branch. Use
`--no-verify` apenas em emergências extremas (ex: reverter um commit
que quebrou o CI). Documente o motivo no PR.

---

## 5. Troubleshooting

| Sintoma                                       | Causa                                 | Solução                                                                          |
| --------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| `gitleaks não está instalado`                 | binário ausente                       | `brew install gitleaks` (macOS) ou binário do release                            |
| `Node X, esperado Y`                          | versão errada                         | `nvm use`                                                                        |
| `Arquivo bloqueado: .env`                     | staging de arquivo sensível           | remova do staging: `git restore --staged <file>`                                 |
| `Arquivo > 5 MB`                              | binário/commit de asset               | use Git LFS ou adicione ao `.gitignore`                                          |
| `scope deve ter um valor`                     | mensagem sem scope                    | adicione o scope do BC: `feat(pedido): ...`                                      |
| `type 'X' não permitido`                      | type fora do enum                     | use um dos 11 types aceitos                                                      |
| `pnpm-lock.yaml inconsistente`                | lockfile drift                        | `pnpm install`                                                                   |
| `secretlint encontrou padrões suspeitos`      | string com cara de secret             | revise o arquivo e remova o valor real                                           |
| `pre-push` muito lento                        | suite completa                        | use `--no-verify` APENAS em emergências; senão, otimize testes (usa `--changed`) |
| `Configuração de ambiente mudou` (post-merge) | `pnpm-lock.yaml` ou `.nvmrc` alterado | rode `pnpm install && pnpm rebuild`                                              |

---

## 6. Arquivos Modificados por Este Setup

- `.husky/_lib.sh` — helpers compartilhados (`log_ok`, `log_warn`, `log_err`, `need`, `check_node`).
- `.husky/pre-commit`, `commit-msg`, `pre-push`, `post-merge`, `post-checkout`.
- `commitlint.config.mjs` — config unificada ESM.
- `scripts/check-dev-env.sh` — diagnóstico do ambiente (rodado por `pnpm env:check`).
- `package.json` — script `env:check` + devDeps `secretlint`, `@secretlint/secretlint-rule-preset-recommend`.

---

## 7. Onde Está o Quê

- **Spec:** `docs/superpowers/specs/2026-08-03-husky-seguranca-consistencia-design.md`
- **Plano:** `docs/superpowers/plans/2026-08-03-husky-seguranca-consistencia.md`
- **Config do git (hooks):** `pnpm prepare` (reaponta `.husky/`)
- **Pre-commit legado do projeto:** `docs/guides/CI_CD.md` (gates no GitHub Actions complementam os locais)
