# Guia de CI/CD — Pedi-AI

Pipeline de integração e entrega contínua do Pedi-AI, com gates de qualidade que bloqueiam merges.

---

## 1. Visão Geral

O projeto utiliza **GitHub Actions** para CI/CD, com pre-commit hooks locais (Husky + lint-staged) para feedback rápido antes do push.

### Jobs do Pipeline

| Job | Gatilho | O que faz |
|-----|---------|-----------|
| `unit-tests` | PR | Vitest: testes unitários |
| `integration-tests` | PR | Vitest: testes de integração |
| `coverage` | PR | Verificação de cobertura ≥ 80% |
| `e2e-tests` (4 shards) | PR | Playwright: testes E2E em paralelo |
| `docs-audit` | schedule/push docs | Verifica consistência da documentação |

### Gates de Bloqueio

Para um PR ser mergeado, **todos** os jobs devem passar:

- `unit-tests` — falha se qualquer teste unitário quebrar
- `integration-tests` — falha se qualquer teste de integração quebrar
- `coverage` — falha se cobertura de código < 80% (statements/branches/functions/lines)
- `e2e-tests` — falha se qualquer teste E2E quebrar

---

## 2. Workflows GitHub Actions

### `.github/workflows/ci.yml` — CI Completo

Disparado em **todo Pull Request**.

```yaml
on: pull_request

jobs:
  lint:
    run: pnpm lint                    # ESLint

  type-check:
    run: pnpm tsc --noEmit           # TypeScript

  unit-tests:
    run: pnpm test:unit

  integration-tests:
    run: pnpm test:integration

  coverage:
    run: pnpm test:coverage          # must meet 80% threshold

  e2e-tests:
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    run: pnpm test:e2e --shard=${{ matrix.shard }}/4
```

### `.github/workflows/e2e.yml` — E2E em Main

Disparado em push para `main`/`master` e em PRs. Executa E2E em 4 shards paralelos com Playwright.

### `.github/workflows/docs-audit.yml` — Auditoria de Docs

Disparado toda segunda-feira às 8h (schedule) ou quando arquivos de documentação mudam (push paths). Roda `node scripts/audit-docs.js` e cria issue no GitHub se encontrar problemas.

---

## 3. Cobertura de Código

### Configuração (vitest.config.ts)

Limiar mínimo: **80%** para todas as métricas.

```typescript
coverage: {
  thresholds: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80,
  }
}
```

### Verificação

```bash
# Local
pnpm test:coverage

# CI (gate automático)
# o job coverage do ci.yml falha se qualquer métrica < 80%
```

### Arquivos Excluídos

Arquivos que não são contados para cobertura (por serem difíceis de unit-testar ou por serem configurações/UI):

- `src/app/api/**` — rotas de API (testadas por E2E)
- `src/app/**/page.tsx` e `layout.tsx` — páginas (testadas por E2E)
- `src/components/**` — componentes UI (testados por E2E)
- `src/lib/supabase/auth.ts`, `client.ts`, `server.ts` — clientes Supabase (inicialização, testados por E2E)
- `src/lib/sw/**` — service workers (testados por E2E)
- `src/domain/**/aggregates/*.ts` — agregados com dependências complexas

---

## 4. Pre-Commit Hooks

### Husky + lint-staged

Hooks executados **localmente** antes de cada commit (via `prepare` script no package.json).

**Arquivo:** `.husky/pre-commit`

```
npx lint-staged
```

**Configuração (package.json):**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write", "tsc --noEmit"],
    "*.{js,mjs,cjs}": ["eslint --fix", "prettier --write"],
    "*.{json,md,mdx,css,scss}": ["prettier --write"]
  }
}
```

### Fluxo do Pre-Commit

1. `eslint --fix` — corrige erros de lint automaticamente
2. `prettier --write` — formata o código
3. `tsc --noEmit` — verifica tipos TypeScript

Se qualquer passo falhar, o commit **não é criado**.

---

## 5. Dependabot

Dependabot mantém dependências atualizadas automaticamente.

**Arquivo:** `.github/dependabot.yml`

Configurado para:
- **npm packages** — verificação semanal
- **GitHub Actions** — verificação semanal

---

## 6. Scripts Disponíveis

```bash
# Testes
pnpm test:unit          # Testes unitários (vitest)
pnpm test:integration   # Testes de integração (vitest)
pnpm test:e2e           # Testes E2E (Playwright, chromium-headless-shell)
pnpm test:e2e:seed      # Popula banco de dados para E2E
pnpm test:coverage      # Testes + relatório de cobertura (v8)
pnpm test:all           # Unit + Integration + E2E

# Lint
pnpm lint               # ESLint

# Build
pnpm build              # Next.js build
```

---

## 7. Configuração de Secrets

Os workflows E2E requerem:

| Secret | Descrição |
|--------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (para seed/admin) |

Configure em: **GitHub repo → Settings → Secrets and variables → Actions**

---

## 8. Branch Protection (Recomendado)

Para bloquear merges que não passem no CI, configure em **Settings → Branches → Branch protection rules**:

- ✅ "Require status checks to pass before merging"
- Status checks obrigatórios: `lint`, `type-check`, `unit-tests`, `integration-tests`, `coverage`, `e2e-tests`
- ✅ "Require branches to be up to date before merging"

---

## 9. Troubleshooting

### Coverage falhando no CI mas passando localmente

Verifique que está rodando a mesma versão de node:
```bash
node --version  # deve ser 20
```

### E2E tests falhando no CI mas passando localmente

O CI usa `chromium-headless-shell`. Verifique que o teste não depende de funcionalidades específicas do SO.

### Pre-commit hook não está rodando

```bash
# Reinstala husky
pnpm prepare
```

---

## Referências

- [Vitest — Coverage](https://vitest.dev/guide/coverage.html)
- [Playwright — CI](https://playwright.dev/docs/ci)
- [Husky — Git hooks](https://typicode.github.io/husky/)
- [lint-staged](https://github.com/lint-staged/lint-staged)
- [Dependabot — GitHub Actions](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
