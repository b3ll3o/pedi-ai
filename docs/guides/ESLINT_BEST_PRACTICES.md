# ESLint Best Practices — Pedi-AI Monorepo

## Diagnóstico Atual

### O que existe ✅

| Item                                        | Status                        |
| ------------------------------------------- | ----------------------------- |
| ESLint v9 flat config (`eslint.config.mjs`) | ✅ apps/web + apps/api        |
| `pnpm lint` roda em ambas apps              | ✅ root package.json          |
| CI executa `pnpm lint`                      | ✅ .github/workflows/ci.yml   |
| Husky + lint-staged (pre-commit)            | ✅                            |
| `eslint-config-next` (web)                  | ✅                            |
| TypeScript ESLint (`@typescript-eslint/*`)  | ✅ root hoisted               |
| DDD layer rules (web domain layer)          | ✅ apps/web/eslint.config.mjs |

### O que está faltando ❌

| Item                                          | Prioridade | Impacto                                    |
| --------------------------------------------- | ---------- | ------------------------------------------ |
| Sem root `eslint.config.mjs`                  | Alta       | Duplicação de config                       |
| Sem `eslint-plugin-import` (ordem de imports) | Alta       | Imports caóticos                           |
| Sem Prettier no ESLint (somente pre-commit)   | Alta       | Erros de formatação só no pre-commit       |
| Sem `eslint-plugin-unicorn` (JS moderno)      | Média      | Padrões JS desatualizados                  |
| Sem `eslint-plugin-n` (Node.js)               | Média      | Boilerplate Node mal一圈                   |
| Sem `eslint-plugin-sonarjs` (qualidade)       | Média      | Bugs sutis não detectados                  |
| Sem `eslint-plugin-jest` (testes)             | Média      | Regras Jest genéricas                      |
| Sem `eslint-plugin-security`                  | Média      | Vulnerabilidades comuns                    |
| Commitlint sem config de commit message       | Alta       | Mensagens de commitbag                     |
| CI: `tsc --noEmit` no root (pode falhar)      | Alta       | Typecheck pode não refletir app real       |
| CI: job `complexity` com comando quebrado     | Baixa      | Usa `--no-eslintrc` que não funciona em v9 |

---

## Melhorias a Implementar

### 1. Root `eslint.config.mjs` — Base Comum

Criar `eslint.config.mjs` no root do monorepo com ignores e regras compartilhadas.

**Arquivo:** `eslint.config.mjs`

- `globalIgnores`: `node_modules/**`, `dist/**`, `.next/**`, `coverage/**`, `*.js` (root level)
- Regras compartilhadas: `no-console` (warn), `prefer-const`, `no-var`

### 2. Plugin Prettier — Formatação no ESLint

Integrar Prettier ao ESLint para que erros de formatação apareçam no `lint` (não só no pre-commit).

**Plugins:**

- `eslint-plugin-prettier` — reporta erros de formatação como warnings do ESLint
- `eslint-config-prettier` — desabilita regras do ESLint que conflitam com Prettier

**Mudança no fluxo:**

```
Antes: pre-commit hook → eslint --fix + prettier --write
Depois: pre-commit hook → eslint --fix + prettier --write
        CI/dev: pnpm lint → ESLint (código + formatação)
```

### 3. Plugins Recomendados

| Plugin                   | Regra          | O que detecta             |
| ------------------------ | -------------- | ------------------------- |
| `eslint-plugin-import`   | `import/order` | Imports fora de ordem     |
| `eslint-plugin-unicorn`  | múltiplas      | JS moderno, anti-patterns |
| `eslint-plugin-n`        | múltiplas      | Boilerplate Node.js       |
| `eslint-plugin-sonarjs`  | múltiplas      | Bugs e code smells        |
| `eslint-plugin-jest`     | múltiplas      | Testes Jest mal escritos  |
| `eslint-plugin-security` | múltiplas      | Padrões inseguros         |

### 4. Configuração por App

**apps/web:**

- Estende `eslint-config-next`
- Regras DDD layer (já existem)
- Test files: `@typescript-eslint/no-explicit-any` off, `ban-ts-comment` off
- Prettier + import/order

**apps/api:**

- TypeScript ESLint rules (já existem)
- Regras DDD layer para estrutura domain/
- NestJS conventions (desabilitar regras desatualizadas)
- Test files: same as web

### 5. Commitlint Config

Criar `commitlint.config.js` exportando `CommitConventionalConfig` com `types` CustomConventionais + regras.

### 6. CI Fixes

- `tsc --noEmit` por app: `pnpm --filter @pedi-ai/web exec tsc --noEmit` + `pnpm --filter @pedi-ai/api exec tsc --noEmit`
- Job `complexity`: usar `eslint` com config das apps (não `--no-eslintrc`)

---

## Riscos e Trade-offs

1. **eslint-plugin-prettier + Prettier**: O plugin reportafmt como erro ESLint. Se o pre-commit roda `--fix`, o lint em CI vai corrigir automaticamente. Trade-off: mais lento, mas mais seguro. Alternativa: usar `format` separadamente.

2. **Muitos plugins**: Cada plugin adiciona overhead. Começar com menosPlugins essenciais e adicionar gradualmente.

3. **DDD rules via `no-restricted-imports`**: Somente funciona para imports explícitos. Não bloqueia imports dinâmicos ou `require()`.

---

## Ordem de Implementação

1. [ ] Criar `eslint.config.mjs` root
2. [ ] Adicionar `eslint-plugin-prettier` + `eslint-config-prettier`
3. [ ] Adicionar `eslint-plugin-import`
4. [ ] Atualizar configs de web e api para estender root
5. [ ] Criar `commitlint.config.js`
6. [ ] Fix CI: type-check por app
7. [ ] Fix CI: job complexity
8. [ ] Adicionar `eslint-plugin-unicorn`
9. [ ] Adicionar `eslint-plugin-sonarjs`
10. [ ] Adicionar `eslint-plugin-jest`
11. [ ] Adicionar `eslint-plugin-security`

---

## Referências

- [ESLint v9 Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [eslint-config-next](https://nextjs.org/docs/app/api-reference/config/eslint)
- [eslint-plugin-import](https://github.com/import-js/eslint-plugin-import)
- [eslint-plugin-unicorn](https://github.com/sindresorhus/unicorn)
- [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier)
- [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier)
- [Commitlint](https://commitlint.js.org/)
