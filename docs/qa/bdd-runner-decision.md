# Decisão de Runner BDD — api-padrao

**Data:** 2026-06-26
**Escopo:** Execução dos 5 arquivos `.feature` em `apps/api/test/features/admin/feature-flags/`.

## TL;DR

- **Stack real verificada:** `vitest@4.1.9` (`apps/api/package.json` linha `test: "vitest"`).
- **Runner escolhido:** `@cucumber/cucumber@^13.0.0` (cucumber-js oficial).
- **Por quê:** vitest-cucumber não existe no registry npm; alternativas vitest-nativas (ex.: `jest-cucumber`) exigem jest. Cucumber-js oficial é independente do vitest, roda em paralelo, e tem CLI próprio. Mantemos vitest intocado para unitários.

## Verificação da stack

Comandos executados:

```bash
cat apps/api/package.json | grep -E "(jest|vitest|cucumber|test)"
# → "test": "vitest"
# → "test:watch": "vitest --watch"
# → "test:cov": "vitest --coverage"
# → "vitest": "^4.1.9"
# → "@nestjs/testing": "^11.1.27"

ls apps/api/jest.config*   # → nenhum
ls apps/api/vitest.config*  # → apps/api/vitest.config.ts (existe)
pnpm view vitest-cucumber   # → 404 (pacote indisponível)
```

**Conclusão:** vitest 4.1.9 confirmado; sem jest; sem vitest-cucumber no registry.

## Opções consideradas

| Opção                       | Compatibilidade                        | Decisão       |
| --------------------------- | -------------------------------------- | ------------- |
| `vitest-cucumber`           | 404 no npm — não existe                | Descartada    |
| `jest-cucumber`             | exige jest                             | Descartada    |
| `@cucumber/cucumber@13`     | independente, CLI próprio, ativo       | **Escolhida** |
| Hand-rolled parser + vitest | viável mas custoso, sem parser oficial | Descartada    |

## Modelo de execução

- `pnpm --filter @pedi-ai/api test` continua rodando **vitest** (unit, e2e).
- `pnpm --filter @pedi-ai/api test:bdd` roda **cucumber-js** apontando para `apps/api/test/features/**/*.feature`.
- `pnpm --filter @pedi-ai/api test:bdd:fast` adiciona `--tags 'not @slow and not @load-test'`.

## Camada de step definitions

- `apps/api/test/step-definitions/feature-flags.steps.ts` — todos os steps em PT-BR.
- `apps/api/test/support/world.ts` — `World` customizado com PrismaService + cache LRU in-process + evaluator + JWT helpers.
- Sem subir servidor HTTP real: as chamadas HTTP são traduzidas em invocações POJO do `FeatureFlagsController` (que já aceita handlers POJO — vide `apps/api/src/presentation/admin/feature-flags/controllers/FeatureFlagsController.ts`).
- Para cenários `@performance` e `@cache`: usa `FeatureFlagEvaluator` direto + cache LRU compartilhado, sem Prisma.

## Limites

- Step files ≤ 250 linhas cada.
- Sem libs exóticas.
- pt-BR em tudo.
- Sem modificar `.feature` files (contrato).
