# BDD — Feature Flags (api)

Esta pasta contém os arquivos `.feature` (Gherkin) e os steps que os tornam
executáveis. Os 5 features cobrem o bounded context `admin/feature-flags`.

## Arquivos

```
features/admin/feature-flags/
├── avaliar-flags.feature      RF-ADM-FF-08 (precedência, rollout, cache, fallback)
├── gerenciar-flags.feature    RF-ADM-FF-01..04 (CRUD de flags)
├── aplicar-overrides.feature  RF-ADM-FF-05..07 (overrides por escopo)
├── audit-log.feature          RF-ADM-FF-09 + RNF-RELI-FF-01
└── rbac-admin.feature         RNF-SEC-FF-01 (matriz owner × manager × staff)
```

## Como rodar

```bash
# Todos os cenários (inclui @slow e @load-test)
pnpm --filter @pedi-ai/api test:bdd

# Pula cenários lentos (recomendado em CI rápido)
pnpm --filter @pedi-ai/api test:bdd:fast

# Apenas um feature (debug local)
pnpm --filter @pedi-ai/api test:bdd:gerenciar
```

## Tags

| Tag            | Significado                                    |
| -------------- | ---------------------------------------------- |
| `@slow`        | Estatística com 1000 usuários ou 1000 amostras |
| `@load-test`   | Carga/throughput, pular em desenvolvimento     |
| `@critico`     | Caminho crítico, sempre rodar                  |
| `@feliz`       | Caminho feliz                                  |
| `@erro`        | Caminho de erro esperado                       |
| `@feliz @rbac` | Matriz de RBAC                                 |
| `@cache`       | Comportamento de cache                         |
| `@fallback`    | Caminho de fallback (RNF-AVAIL-FF-01)          |
| `@auditoria`   | Valida audit log                               |
| `@atomicidade` | Atomicidade Prisma                             |
| `@matriz`      | Esquema do Cenário (varredura)                 |

## Como adicionar um novo cenário

1. **Edite o `.feature`** em `features/admin/feature-flags/<nome>.feature`
2. **Adicione os steps** em `test/step-definitions/<arquivo>.steps.ts`.
   - Steps Given → setup de estado (repo, cache, role, evalCtx)
   - Steps When → ação (HTTP ou chamada direta do evaluator)
   - Steps Then → asserção
3. **Mantenha cada arquivo de steps com ≤ 250 linhas** — divida em `contexto.steps.ts` e `avaliacao.steps.ts` por padrão.
4. **Não invente libs exóticas** — o runner é `@cucumber/cucumber` + stubs em memória.

## Camada de suporte

- `test/support/world.ts` — `FeatureFlagsWorld`: instancia `MemFeatureFlagRepository`, `LruStubCache`, `FeatureFlagMetricsStub`, `FeatureFlagEvaluator`, `FeatureFlagsController`, e os 9 use cases.
- `test/support/mem-repo.ts` — repo em memória com modos `dbDown` e `auditLogDown` para cenários de fallback/atomicidade.
- `test/support/lru-cache.ts` — stub do cache LRU com `prime/invalidate/get/set`, contadores de hits.
- `test/support/metrics-stub.ts` — stub de `FeatureFlagMetrics` com contadores `evaluations`, `fallbacks`, `cacheHits`.

## Decisão de runner

Ver `docs/qa/bdd-runner-decision.md`. Resumo: vitest-cucumber não existe no
registry; usamos `@cucumber/cucumber@13` (independente do vitest).

## Limitações

- Os steps NÃO sobem um servidor HTTP real — invocam o `FeatureFlagsController`
  diretamente via POJO. O guard é aplicado manualmente em `World.callController`.
- O repo é em memória (não usa Prisma), com modos de falha controlada.
- O cache LRU é stub local; o Redis não é tocado.
- Cobertura: 100% dos cenários dos 5 .feature files. Cenários marcados
  `@slow` rodam em `test:bdd` mas são pulados em `test:bdd:fast`.
