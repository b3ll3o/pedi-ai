---
codigo: RNF-RELI-FF-01
titulo: Audit log imutável
categoria: nao-funcional
iso25010: Confiabilidade
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §3 (linha 396)
---

# RNF-RELI-FF-01 — Audit log imutável

## Categoria

Confiabilidade.

## Métrica

Toda mutação em `FeatureFlag` ou `FeatureFlagOverride` gera entrada em `FeatureFlagAuditLog` no mesmo `Prisma.$transaction` (atomicidade).

## Verificação

- Teste unitário mockando transação: se `INSERT INTO audit` falhar, mutação deve falhar.
- Constraint de FK `onDelete: Cascade` impede orphan de audit.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §3 (linha 396)
