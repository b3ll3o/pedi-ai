# BDD — Behavior-Driven Development (Legado)

> **Status:** Estrutura legada, mantida apenas como referência histórica.
> O runner BDD canônico do projeto é **cucumber-js** e vive na API.
>
> Veja também:
>
> - [Decisão de runner](../../../../docs/qa/bdd-runner-decision.md)
> - Features canônicas: [`apps/api/test/features/`](../../../../apps/api/test/features/)
> - Plano de testes: [`docs/qa/feature-flags-test-plan.md`](../../../../docs/qa/feature-flags-test-plan.md)

Os arquivos `.feature` deste diretório foram especificados durante a fase de
discovery do DDD mas **não são executados pelo runner atual**. Para evitar
duplicação, o esforço de BDD foi consolidado em `apps/api/test/features/`
onde está integrado ao cucumber-js via `pnpm --filter @pedi-ai/api test:bdd`.

---

## Estrutura (legado)

```
apps/web/tests/bdd/
├── README.md                       # Este arquivo (legado)
├── features/                       # ⚠️ NÃO usado pelo runner atual
│   ├── autenticacao/
│   │   └── autenticacao.feature
│   ├── admin/
│   │   └── admin-restaurante.feature
│   ├── cardapio/
│   │   └── cardapio-navegacao.feature
│   ├── mesa/
│   │   └── mesa-qr-code.feature
│   ├── pedido/
│   │   └── pedido-completo.feature
│   └── pagamento/
│       └── pagamento-pix.feature
└── steps/                          # vazio (steps nunca foram criados)
```

## Por que foi descontinuado

| Aspecto               | `apps/web/tests/bdd/` (legado)      | `apps/api/test/features/` (atual)     |
| --------------------- | ----------------------------------- | ------------------------------------- |
| Runner                | nenhum (apenas `.feature` escritos) | `@cucumber/cucumber@^13.0.0`          |
| Local de step defs    | `apps/web/tests/bdd/steps/` (vazio) | `apps/api/test/step-definitions/`     |
| Prisma/JWT/DB helpers | n/a                                 | `apps/api/test/support/world.ts`      |
| Execução              | —                                   | `pnpm --filter @pedi-ai/api test:bdd` |
| Cobertura hoje        | apenas `feature-flags/` na API      | em expansão para demais BCs           |

## Migração

Para portar cenários deste diretório para o runner canônico:

1. Copie o `.feature` para `apps/api/test/features/<bc>/`.
2. Crie step definitions em `apps/api/test/step-definitions/<bc>.steps.ts`.
3. Use o `World` customizado de `apps/api/test/support/world.ts`.
4. Atualize a RTM (`pnpm rtm`) para apontar para o novo path.

Veja [`docs/qa/bdd-runner-decision.md`](../../../../docs/qa/bdd-runner-decision.md)
para contexto completo da decisão.
