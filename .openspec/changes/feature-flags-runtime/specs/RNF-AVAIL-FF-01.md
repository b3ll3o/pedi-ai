---
codigo: RNF-AVAIL-FF-01
titulo: Fallback em falha de DB/Redis
categoria: nao-funcional
iso25010: Disponibilidade
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §3 (linha 337)
---

# RNF-AVAIL-FF-01 — Fallback em falha de DB/Redis

## Categoria

Disponibilidade.

## Métrica

100% dos requests de `/evaluate` retornam algum valor (DB, cache ou env-var) mesmo com Postgres e Redis fora do ar.

## Verificação

- Teste E2E derruba Postgres e Redis em `docker-compose`, verifica que `evaluate()` retorna `defaultValue` ou env-var legado.
- Circuit breaker: após 5 falhas consecutivas em 10 s, `evaluate()` bypassa DB por 30 s.
- Métrica Prometheus: `feature_flag_fallback_total{reason}`.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §3 (linha 337)
