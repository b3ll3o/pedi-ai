---
codigo: RF-ADM-FF-06
titulo: Remover override de feature flag
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 178)
---

# RF-ADM-FF-06 — Remover override de feature flag

## Ator

`owner`.

## Trigger

`DELETE /api/v1/admin/feature-flags/:key/overrides/:id`.

## Pré-condições

- Token JWT válido com papel `owner` no restaurante escopo.
- Override com `:id` deve existir e pertencer à flag `:key`.

## Pós-condições

Override removido. Entrada em `FeatureFlagAuditLog` (`action = "OVERRIDE_REMOVE"`, com snapshot `before`).

## Regras de negócio

- MUST invalidar entradas do cache Redis e LRU para esta chave após remoção.
- Auditoria MUST preservar snapshot `before` do override removido para fins de rastreabilidade.

## Materialização

- `apps/api/src/application/admin/feature-flags/RemoverOverrideUseCase.ts` (`@spec(RF-ADM-FF-06)`)

## Cenário BDD

`features/admin/feature-flags/overrides.feature` — `Cenário: Owner remove override RESTAURANT e cache invalida`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 178)
