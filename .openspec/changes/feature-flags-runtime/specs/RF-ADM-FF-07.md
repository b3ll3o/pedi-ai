---
codigo: RF-ADM-FF-07
titulo: Listar overrides de uma flag
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 193)
---

# RF-ADM-FF-07 — Listar overrides de uma flag

## Ator

`owner` ou `manager`.

## Trigger

`GET /api/v1/admin/feature-flags/:key/overrides`.

## Pré-condições

- Token JWT válido com papel `owner` ou `manager` no restaurante escopo.
- Flag com a chave `:key` deve existir.

## Pós-condições

Array de overrides ativos (não-expirados), ordenados por `scope` asc.

## Regras de negócio

- Filtra automaticamente overrides com `expiresAt < now()`.
- MUST paginar (limit 50, offset).

## Materialização

- `apps/api/src/application/admin/feature-flags/ListarOverridesUseCase.ts` (`@spec(RF-ADM-FF-07)`)

## Cenário BDD

`features/admin/feature-flags/overrides.feature` — `Cenário: Manager lista overrides ativos excluindo expirados`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 193)
