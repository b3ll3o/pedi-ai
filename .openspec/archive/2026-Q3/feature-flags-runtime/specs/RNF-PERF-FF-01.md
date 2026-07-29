---
codigo: RNF-PERF-FF-01
titulo: Latência de avaliação
categoria: nao-funcional
iso25010: Eficiencia-de-desempenho
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §3 (linha 321)
---

# RNF-PERF-FF-01 — Latência de avaliação

## Categoria

Performance (ISO 25010 — Eficiência de desempenho).

## Métrica

`evaluate()` com 1 chave:

- **p99 < 5 ms** quando há cache hit (Redis ou LRU).
- **p99 < 50 ms** quando há cache miss (consulta Postgres + repopula cache).

## Verificação

- Benchmark `k6` com 1000 RPS sustentados por 60 s contra `/evaluate?keys=pix_enabled`.
- Métrica exposta em `/metrics` Prometheus: `feature_flag_evaluate_duration_seconds_bucket`.
- Teste de carga em CI nightly.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §3 (linha 321)
