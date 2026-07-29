---
codigo: RNF-MAINT-FF-01
titulo: SDK único tipado
categoria: nao-funcional
iso25010: Manutenibilidade
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §3 (linha 382)
---

# RNF-MAINT-FF-01 — SDK único tipado

## Categoria

Manutenibilidade.

## Métrica

1 SDK (`@pedi-ai/feature-flags`) consumido por front e back; cobertura de tipos 100% nas flags seed.

## Verificação

- TypeScript `strict: true`, `noUncheckedIndexedAccess: true`.
- Zod schema único em `packages/feature-flags/src/schema.ts` importado por front e back.
- Sem `any` em código de produção (`grep -rE ': any' apps/ packages/` retorna 0 hits no escopo do SDK).

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §3 (linha 382)
