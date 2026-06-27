---
codigo: RF-ADM-FF-04
titulo: Atualizar feature flag
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 122)
---

# RF-ADM-FF-04 — Atualizar feature flag

## Ator

`owner`.

## Trigger

`PATCH /api/v1/admin/feature-flags/:key` com `{ description?, defaultValue?, enabled? }`.

## Pré-condições

- Token JWT válido com papel `owner` no restaurante escopo.
- Flag com a chave `:key` deve existir.

## Pós-condições

Flag atualizada; entrada em `FeatureFlagAuditLog` com `before` e `after`.

## Regras de negócio

- MUST NOT permitir alterar `key` (imutável — chave canônica).
- MUST NOT permitir alterar `valueType` depois da criação (quebra auditabilidade).
- `enabled = false` MUST fazer a flag ser tratada como "desligada" em todas as avaliações (precedência absoluta, antes mesmo de `defaultValue`).

## Materialização

- `apps/api/src/application/admin/feature-flags/AtualizarFeatureFlagUseCase.ts` (`@spec(RF-ADM-FF-04)`)

## Cenário BDD

`features/admin/feature-flags/atualizar.feature` — `Cenário: Owner desabilita flag e auditoria registra before/after`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 122)
