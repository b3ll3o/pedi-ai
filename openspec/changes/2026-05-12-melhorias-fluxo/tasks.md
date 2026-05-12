# Tasks — Melhorias no Fluxo de Desenvolvimento

## Visão Geral

Este documento contém todas as tarefas para melhorar o fluxo de desenvolvimento do Pedi-AI.

---

## Sprint 1: Processo Básico

### 1.1 Criar STATUS.md

- [x] 1.1.1 Criar `openspec/changes/STATUS.md`
- [x] 1.1.2 Listar todos os changes ativos
- [x] 1.1.3 Listar todos os changes arquivados
- [x] 1.1.4 Incluir métricas: issues abertas, tasks pendentes, cobertura atual

### 1.2 Corrigir Lifecycle de Issues

- [x] 1.2.1 Criar folder `issues/in_progress/`
- [x] 1.2.2 Criar folder `issues/review/`
- [x] 1.2.3 Criar folder `issues/done/`
- [x] 1.2.4 Criar folder `issues/blocked/`
- [x] 1.2.5 Atualizar `issues/README.md` com instruções

### 1.3 Numerar Issues Sequencialmente

- [x] 1.3.1 Criar script para gerar próximo ID (PED-001, PED-002, etc)
- [x] 1.3.2 Atualizar issues existentes com IDs
- [x] 1.3.3 Documentar convenção em `issues/README.md`

### 1.4 Coverage Gate no CI

- [x] 1.4.1 Editar `ci.yml` para falhar se coverage < 80%
- [x] 1.4.2 Adicionar step de coverage check
- [x] 1.4.3 Adicionar job ci-pass que verifica todos os checks

### 1.5 CI Server Reliability

- [x] 1.5.1 Migrar dev server startup de `pnpm dev &` para `webServer` config
- [x] 1.5.2 Remover startup manual do ci.yml
- [x] 1.5.3 Aplicar mesma mudança em e2e.yml

### 1.6 Corrigir Lint Errors

- [x] 1.6.1 Corrigir 190 errors de lint ( ESLint ignore para playwright-report)
- [x] 1.6.2 Resultado: 0 errors, 81 warnings

---

## Sprint 2: Qualidade

### 2.1 Triage de Testes Falhando

- [x] 2.1.1 Executar suite de testes e catalogar falhas (21 testes falhando)
- [x] 2.1.2 Classificar: pré-existente vs introduzido por mudança
- [x] 2.1.3 Criar issues para cada categoria de falha (PED-031 criado)
- [ ] 2.1.4 Atribuir responsáveis

### 2.2 Corrigir Testes Pré-existentes

- [ ] 2.2.1 Começar pelos mais simples (syntax/import errors)
- [ ] 2.2.2 Corrigir repository tests com fake-indexeddb
- [ ] 2.2.3 Verificar cada correção com `pnpm test`

### 2.3 Revisar Coverage Config

- [x] 2.3.1 Analisar `vitest.config.ts` linhas 23-77
- [x] 2.3.2 Avaliar se exclusões são justificadas
- [x] 2.3.3 Coverage configurado com 80% threshold

### 2.4 Verificar Documentation

- [x] 2.4.1 Atualizar `codemap.md` com números reais (1427 testes, 32 specs E2E)
- [ ] 2.4.2 Verificar se AGENTS.md está em sync
- [ ] 2.4.3 Audit de documentação desatualizada

### 2.5 Script de Relatórios

- [x] 2.5.1 Criar script `scripts/generate-progress-report.js`
- [x] 2.5.2 Agregar status de tasks de todos os changes
- [x] 2.5.3 Gerar output markdown para PROGRESSO.md

---

## Sprint 3: Integração GStack

### 3.1 Adotar /review

- [x] 3.1.1 Criar docs/GSTACK_INTEGRATION.md
- [x] 3.1.2 Criar script scripts/gstack/review.js
- [x] 3.1.3 Scripts adicionados ao package.json

### 3.2 Adotar /qa

- [x] 3.2.1 Criar script scripts/gstack/qa.js
- [x] 3.2.2 Integrar com Playwright existente

### 3.3 Adotar /ship

- [x] 3.3.1 Criar script scripts/gstack/ship.js
- [x] 3.3.2 Integrar com coverage audit

### 3.4 Adotar /office-hours

- [x] 3.4.1 Criar script scripts/gstack/office-hours.js
- [x] 3.4.2 Template de refinement de features

### 3.5 Adotar /investigate

- [ ] 3.5.1 Criar metodologia de debug sistemático
- [ ] 3.5.2 Aplicar aos 21 testes falhando (PED-031)

---

## Sprint 4: Release Automation

### 4.1 Changelog Automatizado

- [ ] 4.1.1 Instalar `standard-version` ou `release-please` (pendente)
- [ ] 4.1.2 Configurar em package.json
- [ ] 4.1.3 Testar geração de changelog
- [ ] 4.1.4 Configurar em CI para releases automáticas

### 4.2 Dynamic E2E Shards

- [x] 4.2.1 Criar script detect-shards.js
- [ ] 4.2.2 Substituir shards hardcoded [1,2,3,4] no ci.yml
- [ ] 4.2.3 Testar em ambiente CI

### 4.3 Conventional Commits

- [x] 4.3.1 Instalar commitlint + conventional commits config
- [x] 4.3.2 Configurar .commitlintrc.js
- [x] 4.3.3 Adicionar commitlint ao pre-commit hook (.husky/commit-msg)
- [ ] 4.3.4 Migrar histórico (opcional)

### 4.4 Pre-push Hook

- [x] 4.4.1 Adicionar `pnpm build` ao pre-push (.husky/pre-push)
- [ ] 4.4.2 Testar que não quebra pushes legítimos

### 4.5 Consolidar CI Workflows

- [x] 4.5.1 Remover startup manual do dev server (webServer config usado)
- [x] 4.5.2 Adicionar coverage gate no CI (ci-pass job)

---

## Task Metadata

```yaml
change: 2026-05-12-melhorias-fluxo
version: 1.0.0
created: 2026-05-12
owner: @orchestrator
sprints: 4
total_tasks: 25
```