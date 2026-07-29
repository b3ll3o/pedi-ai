---
codigo: RF-ADM-FF-03
titulo: Criar feature flag
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 95)
---

# RF-ADM-FF-03 — Criar feature flag

## Ator

`owner`.

## Trigger

`POST /api/v1/admin/feature-flags` com `{ key, description, valueType, defaultValue }`.

## Pré-condições

- `key` único, snake*case, ASCII `[a-z0-9*]{3,64}`.
- `defaultValue` compatível com `valueType` (validado por Zod).

## Pós-condições

Flag persistida com `enabled = true` por padrão. Entrada em `FeatureFlagAuditLog` (`action = "CREATE"`).

## Regras de negócio

- MUST NOT permitir criar flag com `key` igual a uma flag de env-var se isso quebraria contrato (ex.: tentar criar `pix_enabled` minúsculo vs `PIX_ENABLED` do legado). Validação: `key` MUST seguir convenção `snake_case` e o mapper de compat é case-insensitive.
- MUST rejeitar criação de flag sem `valueType`.

## Materialização

- `apps/api/src/application/admin/feature-flags/CriarFeatureFlagUseCase.ts` (`@spec(RF-ADM-FF-03)`)
- Auditoria: `FeatureFlagAuditLogger.log({ action: "CREATE", actorId, before: null, after: flag })`.

## Cenário BDD

`features/admin/feature-flags/criar.feature` — `Cenário: Owner cria flag booleana com sucesso`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 95)
