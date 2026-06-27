---
codigo: RNF-SEC-FF-01
titulo: RBAC granular
categoria: nao-funcional
iso25010: Seguranca
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §3 (linha 351)
---

# RNF-SEC-FF-01 — RBAC granular

## Categoria

Segurança.

## Métrica

- `owner` MUST ter acesso a todos os métodos de flag (CRUD + override).
- `manager` MUST ter acesso somente leitura (listar, obter, audit, evaluate).
- `staff` MUST NOT ter acesso a nenhum endpoint admin de flag (apenas ao SDK de leitura client-side).
- Endpoint `/evaluate` é público mas rate-limited (100 req/min/IP).

## Verificação

- Teste E2E para cada papel × cada método × esperado (200/403).
- `Guard` no NestJS verifica papel antes do controller; fail-closed.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §3 (linha 351)
