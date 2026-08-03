---
codigo: RF-ADM-FF-02
titulo: Obter feature flag por chave
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 74)
---

# RF-ADM-FF-02 — Obter feature flag por chave

## Ator

`owner` ou `manager`.

## Trigger

`GET /api/v1/admin/feature-flags/:key`.

## Pré-condições

- Token JWT válido com papel `owner` ou `manager` no restaurante escopo (header `x-restaurante-id`).

## Pós-condições

Detalhe completo da flag incluindo overrides (RF-ADM-FF-07 inline).

## Regras de negócio

- MUST retornar `404` se a chave não existir (sem vazar existência para flag猜測).
- `defaultValue` MUST estar tipado de acordo com `valueType` (validado no DTO de saída).

## Materialização

- `apps/api/src/application/admin/feature-flags/ObterFeatureFlagPorChaveUseCase.ts` (`@spec(RF-ADM-FF-02)`)

## Cenário BDD

`features/admin/feature-flags/obter.feature` — `Cenário: Owner obtém flag existente com overrides`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 74)
