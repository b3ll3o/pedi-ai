# Design: Agente `analista-frontend` baseado na trilha roadmap.sh/frontend

**Data**: 2026-06-26
**Status**: Aprovado pelo usuário

## Objetivo

Criar um agente de IA especializado em frontend, baseado na trilha oficial
[roadmap.sh/frontend](https://roadmap.sh/frontend), capaz de assessorar revisões,
implementações e decisões técnicas em código frontend (especialmente no stack
do Pedi-AI: Next.js 16 + React 19 + TypeScript).

## Escopo

- **Cobertura**: trilha completa (16 áreas temáticas da trilha oficial).
- **Profundidade**: cada skill é referência completa (~400-700 linhas) com
  conceitos, exemplos de código, boas práticas, anti-patterns e bibliografia.
- **Idioma**: pt-BR (regra do AGENTS.md), termos técnicos em inglês quando padrão.
- **Localização**: `.claude/agents/analista-frontend.md` e `.claude/skills/frontend/`.

## Estrutura

```
.claude/
├── agents/
│   └── analista-frontend.md          # Agent (formato dos agents existentes)
└── skills/
    └── frontend/
        ├── SKILL.md                              # Índice + invocação
        ├── frontend-internet-web.md
        ├── frontend-html.md
        ├── frontend-css.md
        ├── frontend-css-architecture.md
        ├── frontend-javascript.md
        ├── frontend-typescript.md
        ├── frontend-version-control.md
        ├── frontend-frameworks.md
        ├── frontend-meta-frameworks.md
        ├── frontend-build-tools.md
        ├── frontend-testing.md
        ├── frontend-web-components.md
        ├── frontend-performance.md
        ├── frontend-security.md
        ├── frontend-pwa-mobile-desktop.md
        └── frontend-apis-realtime.md
```

## Decisões de Design

| Decisão            | Escolha                                   |
| ------------------ | ----------------------------------------- |
| Granularidade      | Skill raiz + 16 sub-skills hierárquicas   |
| Profundidade       | Profunda (referência completa)            |
| Idioma             | pt-BR                                     |
| Invocation pattern | Agent chama skills on-demand              |
| Formato por skill  | Frontmatter YAML + seções padronizadas    |
| Formato do agent   | Markdown simples (igual code-reviewer.md) |

## Formato Padrão de Cada Sub-skill

```markdown
---
name: frontend-<area>
description: <uma linha, quando invocar>
---

# <Título>

## Visão Geral

## Conceitos-Chave (com exemplos)

## Boas Práticas (Do/Don't)

## Anti-Patterns Comuns

## Relação com Pedi-AI (Next.js 16 / React 19 / offline-first)

## Recursos (MDN, docs oficiais)
```

## Plano de Execução

1. Pesquisar tópicos via WebFetch (paralelo)
2. Criar skill raiz (`SKILL.md`) com índice
3. Criar 16 sub-skills
4. Criar agent (`analista-frontend.md`)
5. Validar frontmatter e referências cruzadas
6. Commit
