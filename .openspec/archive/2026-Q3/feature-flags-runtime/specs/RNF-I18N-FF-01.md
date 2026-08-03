---
codigo: RNF-I18N-FF-01
titulo: Localização pt-BR
categoria: nao-funcional
iso25010: Compatibilidade / Localizacao
status: aprovado
origem: .openspec/changes/feature-flags-runtime/design.md §3 (linha 369)
---

# RNF-I18N-FF-01 — Localização pt-BR

## Categoria

Localização.

## Métrica

100% das mensagens de erro e rótulos de UI em pt-BR.

## Verificação

- Snapshot test dos componentes React verifica string PT-BR.
- Teste E2E assina `lang: pt-BR` e varre `page.content()` procurando palavras-chave.

## Rastreabilidade

- Mudança: `.openspec/changes/feature-flags-runtime/`
- Design completo: `.openspec/changes/feature-flags-runtime/design.md` §3 (linha 369)
