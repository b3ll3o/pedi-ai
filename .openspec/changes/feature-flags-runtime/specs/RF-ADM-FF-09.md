---
codigo: RF-ADM-FF-09
titulo: Visualizar audit log de uma flag
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 262)
---

# RF-ADM-FF-09 — Visualizar audit log de uma flag

## Ator

`owner` ou `manager`.

## Trigger

`GET /api/v1/admin/feature-flags/:key/audit?limit=50&offset=0`.

## Pré-condições

- Token JWT válido com papel `owner` ou `manager` no restaurante escopo.
- Flag com a chave `:key` deve existir.

## Pós-condições

Lista paginada de entradas `{ id, actorId, action, before, after, reason, createdAt }`.

## Regras de negócio

- MUST ordenar por `createdAt DESC`.
- `action` ∈ {`CREATE`, `UPDATE`, `TOGGLE`, `OVERRIDE_ADD`, `OVERRIDE_REMOVE`, `ROLLOUT_CHANGE`}.
- `manager` MUST ver o mesmo conteúdo que `owner` (sem mascaramento — auditoria é leitura, não mutação).

## Materialização

- `apps/api/src/application/admin/feature-flags/ListarAuditLogUseCase.ts` (`@spec(RF-ADM-FF-09)`)

## Cenário BDD

`features/admin/feature-flags/audit.feature` — `Cenário: Manager consulta audit log ordenado por data decrescente`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 262)
