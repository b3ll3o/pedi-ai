---
codigo: RF-ADM-FF-01
titulo: Listar feature flags
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 50)
---

# RF-ADM-FF-01 — Listar feature flags

## Ator

`owner` ou `manager` autenticado.

## Trigger

`GET /api/v1/admin/feature-flags`.

## Pré-condições

- Token JWT válido com papel `owner` ou `manager` no restaurante escopo (header `x-restaurante-id`).

## Pós-condições

Lista paginada de flags com `{ key, description, valueType, defaultValue, enabled, overrideCount }`.

## Regras de negócio

- Cada flag MUST incluir contagem de overrides ativos (RF-ADM-FF-07 derivado).
- `manager` recebe a mesma resposta que `owner` neste endpoint (sem PII, sem campos sensíveis).

## Materialização

- `apps/api/src/presentation/admin/feature-flags/feature-flags.controller.ts` (handler `list`)
- `apps/api/src/application/admin/feature-flags/ListarFeatureFlagsUseCase.ts` (`@spec(RF-ADM-FF-01)`)

## Cenário BDD

`features/admin/feature-flags/listar.feature` — `Cenário: Owner lista todas as flags com contagem de overrides`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 50)
