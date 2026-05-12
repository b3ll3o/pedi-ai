# Tasks — Melhorias no Fluxo de Desenvolvimento

## Visão Geral

Este documento contém todas as tarefas para melhorar o fluxo de desenvolvimento do Pedi-AI.

---

## Sprint 1: Processo Básico

### 1.1 Criar STATUS.md

- [ ] 1.1.1 Criar `openspec/changes/STATUS.md`
- [ ] 1.1.2 Listar todos os changes ativos
- [ ] 1.1.3 Listar todos os changes arquivados
- [ ] 1.1.4 Incluir métricas: issues abertas, tasks pendentes, cobertura atual

### 1.2 Corrigir Lifecycle de Issues

- [ ] 1.2.1 Criar folder `issues/in_progress/`
- [ ] 1.2.2 Criar folder `issues/review/`
- [ ] 1.2.3 Criar folder `issues/done/`
- [ ] 1.2.4 Criar folder `issues/blocked/`
- [ ] 1.2.5 Atualizar `issues/README.md` com instruções

### 1.3 Numerar Issues Sequencialmente

- [ ] 1.3.1 Criar script para gerar próximo ID (PED-001, PED-002, etc)
- [ ] 1.3.2 Atualizar issues existentes com IDs
- [ ] 1.3.3 Documentar convenção em `issues/README.md`

### 1.4 Coverage Gate no CI

- [ ] 1.4.1 Editar `ci.yml` para falhar se coverage < 80%
- [ ] 1.4.2 Adicionar step de coverage check
- [ ] 1.4.3 Testar em branch separado

### 1.5 CI Server Reliability

- [ ] 1.5.1 Migrar dev server startup de `pnpm dev &` para `webServer` config
- [ ] 1.5.2 Remover startup manual do ci.yml
- [ ] 1.5.3 Aplicar mesma mudança em e2e.yml

### 1.6 Corrigir Lint Errors

- [ ] 1.6.1 Executar `pnpm lint --fix`
- [ ] 1.6.2 Review das mudanças
- [ ] 1.6.3 Commit com conventional commit message

---

## Sprint 2: Qualidade

### 2.1 Triage de Testes Falhando

- [ ] 2.1.1 Executar suite de testes e catalogar falhas
- [ ] 2.1.2 Classificar: pré-existente vs introduzido por mudança
- [ ] 2.1.3 Criar issues para cada categoria de falha
- [ ] 2.1.4 Atribuir responsáveis

### 2.2 Corrigir Testes Pré-existentes

- [ ] 2.2.1 Começar pelos mais simples (syntax/import errors)
- [ ] 2.2.2 Corrigir repository tests com fake-indexeddb
- [ ] 2.2.3 Verificar cada correção com `pnpm test`

### 2.3 Revisar Coverage Config

- [ ] 2.3.1 Analisar `vitest.config.ts` linhas 23-77
- [ ] 2.3.2 Avaliar se exclusões são justificadas
- [ ] 2.3.3 Remover exclusões desnecessárias
- [ ] 2.3.4 Garantir que coverage mede código relevante

### 2.4 Verificar Documentation

- [ ] 2.4.1 Atualizar `codemap.md` com números reais de coverage
- [ ] 2.4.2 Verificar se AGENTS.md está em sync
- [ ] 2.4.3 Audit de documentação desatualizada

### 2.5 Script de Relatórios

- [ ] 2.5.1 Criar script `scripts/generate-progress-report.js`
- [ ] 2.5.2 Agregar status de tasks de todos os changes
- [ ] 2.5.3 Gerar output markdown para PROGRESSO.md
- [ ] 2.5.4 Adicionar ao workflow semanal

---

## Sprint 3: Integração GStack

### 3.1 Adotar /review

- [ ] 3.1.1 Estudar slash command /review do gstack
- [ ] 3.1.2 Criar skill equivalente ou integrar
- [ ] 3.1.3 Documentar uso em AGENTS.md
- [ ] 3.1.4 Testar em um PR

### 3.2 Adotar /qa

- [ ] 3.2.1 Estudar slash command /qa do gstack
- [ ] 3.2.2 Integrar com Playwright existente
- [ ] 3.2.3 Criar workflow de QA post-deploy
- [ ] 3.2.4 Documentar em AGENTS.md

### 3.3 Adotar /ship

- [ ] 3.3.1 Estudar slash command /ship do gstack
- [ ] 3.3.2 Implementar automação de release
- [ ] 3.3.3 Integrar com coverage audit
- [ ] 3.3.4 Documentar em AGENTS.md

### 3.4 Adotar /office-hours

- [ ] 3.4.1 Estudar slash command /office-hours do gstack
- [ ] 3.4.2 Criar template para refinement de features
- [ ] 3.4.3 Documentar em AGENTS.md

### 3.5 Adotar /investigate

- [ ] 3.5.1 Estudar slash command /investigate do gstack
- [ ] 3.5.2 Criar metodologia de debug sistemático
- [ ] 3.5.3 Aplicar aos 41 testes falhando
- [ ] 3.5.4 Documentar em AGENTS.md

---

## Sprint 4: Release Automation

### 4.1 Changelog Automatizado

- [ ] 4.1.1 Instalar `standard-version` ou `release-please`
- [ ] 4.1.2 Configurar em package.json
- [ ] 4.1.3 Testar geração de changelog
- [ ] 4.1.4 Configurar em CI para releases automáticas

### 4.2 Dynamic E2E Shards

- [ ] 4.2.1 Detectar número de CPUs dinamicamente
- [ ] 4.2.2 Substituir shards hardcoded [1,2,3,4]
- [ ] 4.2.3 Atualizar ci.yml e e2e.yml
- [ ] 4.2.4 Testar em ambiente CI

### 4.3 Conventional Commits

- [ ] 4.3.1 Instalar commitlint + conventional commits config
- [ ] 4.3.2 Configurar .commitlintrc.json
- [ ] 4.3.3 Adicionar commitlint ao pre-commit hook
- [ ] 4.3.4 Migrar histórico (opcional)

### 4.4 Pre-push Hook

- [ ] 4.4.1 Adicionar `pnpm build` ao pre-push
- [ ] 4.4.2 Testar que não quebra pushes legítimos
- [ ] 4.4.3 Documentar em CONTRIBUTING.md

### 4.5 Consolidar CI Workflows

- [ ] 4.5.1 Analisar ci.yml e e2e.yml
- [ ] 4.5.2 Unificar jobs duplicados
- [ ] 4.5.3 Garantir consistência de configuração
- [ ] 4.5.4 Remover e2e.yml redundante

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