---
codigo: RF-ADM-FF-05
titulo: Adicionar override de feature flag
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 143)
---

# RF-ADM-FF-05 — Adicionar override de feature flag

## Ator

`owner`.

## Trigger

`POST /api/v1/admin/feature-flags/:key/overrides` com `{ scope: GLOBAL|RESTAURANT|USER, scopeId?: string, value: Json, rolloutPct?: 0..100, expiresAt?: ISODate }`.

## Pré-condições

- Flag existe e está `enabled = true`.
- Se `scope = GLOBAL`, `scopeId` MUST ser `null`.
- Se `scope ∈ {RESTAURANT, USER}`, `scopeId` MUST ser não-nulo.
- `rolloutPct` quando presente MUST estar em `[0, 100]`.

## Pós-condições

Override persistido. Entrada em `FeatureFlagAuditLog` (`action = "OVERRIDE_ADD"`).

## Regras de negócio

- MUST validar `value` contra `valueType` da flag (BOOLEAN/STRING/NUMBER/JSON) no DTO com Zod.
- `expiresAt` MUST ser no futuro.
- MUST impedir 2 overrides com mesma `(flagId, scope, scopeId)` (constraint `@@unique`).
- MUST invalidar entradas do cache Redis e LRU para esta chave.

## Materialização

- `apps/api/src/application/admin/feature-flags/AdicionarOverrideUseCase.ts` (`@spec(RF-ADM-FF-05)`)

## Cenário BDD

`features/admin/feature-flags/overrides.feature`:

- `Cenário: Owner adiciona override RESTAURANT para restaurante X`.
- `Cenário: Rejeita override GLOBAL com scopeId não-nulo`.
- `Cenário: Rollout 50% por usuário é determinístico pelo userId`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 143)
