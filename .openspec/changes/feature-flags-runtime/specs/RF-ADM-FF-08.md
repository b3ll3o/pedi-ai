---
codigo: RF-ADM-FF-08
titulo: Avaliar feature flags (resolver valor final)
categoria: funcional
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §2 (linha 215)
---

# RF-ADM-FF-08 — Avaliar feature flags (resolver valor final)

## Ator

Sistema (front-end, back-end, jobs). Endpoint público (sem RBAC) para o front renderizar UI condicional.

## Trigger

`GET /api/v1/admin/feature-flags/evaluate?keys=offline_enabled,pix_enabled&restaurantId=...&userId=...`.

## Pré-condições

- `keys` é CSV de 1-32 chaves válidas (snake_case).

## Pós-condições

Mapa `{ key: resolvedValue }` respeitando precedência abaixo.

## Algoritmo de avaliação (RF-ADM-FF-08 MUST)

Para cada `key`:

1. Se flag `enabled = false` → retorna `defaultValue` (desabilitada).
2. Senão, procurar override na ordem de precedência:
   1. `scope = USER` com `scopeId = "<restaurantId>:<userId>"` (override usuário + restaurante).
   2. `scope = RESTAURANT` com `scopeId = restaurantId`.
   3. `scope = USER` com `scopeId = userId` (override usuário global).
   4. `scope = GLOBAL` com `scopeId = null`.
3. Se override tem `rolloutPct` definido e `< 100`:
   - Calcula `hash = FNV-1a(64)(flagId + ":" + userId || restaurantId) % 100`.
   - Se `hash < rolloutPct`, aplica `value`; senão, cai para próxima regra da cadeia.
4. Sem override aplicável → `defaultValue`.

## Regras de negócio

- `evaluate()` MUST usar cache (Redis hit → LRU in-process → DB).
- MUST registrar métrica Prometheus `feature_flag_evaluations_total{key, scope, hit}`.
- MUST falhar de forma graciosa (RNF-AVAIL-FF-01): em erro de DB ou Redis, retorna `defaultValue` e loga warning.
- O endpoint MUST aplicar rate limit (100 req/min por IP) para evitar abuso — alinhado com `RNF-SEC-01` global.

## Materialização

- `apps/api/src/application/admin/feature-flags/AvaliarFeatureFlagUseCase.ts` (`@spec(RF-ADM-FF-08)`)
- `FeatureFlagEvaluator` (serviço puro, sem dependência de framework).

## Cenário BDD

`features/admin/feature-flags/avaliar.feature`:

- `Cenário: Flag global default ON sem override`.
- `Cenário: Override por restaurante tem precedência sobre GLOBAL`.
- `Cenário: Override por usuário (restaurantId+userId) tem precedência sobre RESTAURANT`.
- `Cenário: Rollout 50% — mesma chave+userId retorna sempre o mesmo valor`.
- `Cenário: Fallback env-var quando DB indisponível`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §2 (linha 215)
