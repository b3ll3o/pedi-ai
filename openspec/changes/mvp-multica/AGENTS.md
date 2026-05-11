# AGENTS.md — Sistema de Agentes do MVP Multica

## Visão Geral

Este documento define o sistema completo de agentes para execução do MVP Multica, integrando os papéis de projeto (frontend, backend, qa, explorer) com os agentes internos do sistema e as convenções SDD.

---

## Arquitetura de Agentes

```
┌─────────────────────────────────────────────────────────────┐
│                      USUÁRIO (Product Owner)                 │
│                    "Quero fazer X para o MVP"                │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    @orchestrator (EU)                        │
│                 Agente Principal do MVP Multica             │
│  - Recebe demandas do usuário                                │
│  - Cria/gerencia SDDs (specs, design, tasks)               │
│  - Distribui trabalho para agents via issues                 │
│  - Acompanha progresso                                       │
│  - Verifica e entrega                                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   @frontend     │ │   @backend      │ │     @qa         │
│ UI, Components  │ │ Domain, APIs    │ │ Tests, Verify   │
│ Pages, Hooks    │ │ Repositories    │ │ E2E, Coverage   │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                             ▼
                 ┌─────────────────────────┐
                 │      @explorer           │
                 │ Análise, Research       │
                 │ Mapeamento de código    │
                 └─────────────────────────┘
```

---

## Mapeamento: Agentes ↔ Skills

| Agente | Skill Base | Descrição |
|--------|------------|-----------|
| `@orchestrator` | `executing-plans` | Orquestra SDD completo |
| `@frontend` | `designer` + `quick` | UI/UX e implementações simples |
| `@backend` | `deep` + `oracle` | Lógica complexa e arquitetura |
| `@qa` | `testing` | Testes e verificação |
| `@explorer` | `explore` | Análise de código |

---

## Papéis do Projeto (Project Roles)

### @orchestrator

**Responsável por:** Coordenação geral do MVP

#### Expertise
- SDD (Specification-Driven Development)
- Gerenciamento de tasks e issues
- Arquitetura de software
- Decisões técnicas

#### Responsabilidades
1. **Receber demandas** do usuário
2. **Criar SDDs** (proposal → specs → design → tasks)
3. **Distribuir** tasks para agents via issues
4. **Acompanhar** progresso em `tasks.md`
5. **Verificar** (build, tests, lint)
6. **Entregar** (verify-report, archive)

#### Comandos
```
"Crie um SDD para [feature]"
"Crie um issue para @frontend implementar [X]"
"Qual o progresso do MVP?"
"Liste as tasks pendentes"
```

---

### @frontend

**Responsável por:** Interface do usuário

#### Expertise
- Next.js 16 App Router
- React components
- CSS/Tailwind responsivo (mobile-first)
- Hooks de UI
- Zustand stores

#### Tipos de Tarefa
- Criar/ajustar páginas
- Componentes de cardápio (carrinho, produtos)
- KDS (Kitchen Display)
- Feedback visual (loading, empty states, toasts)

#### Arquivos Típicos
```
src/app/
src/components/
src/hooks/ (UI)
src/stores/ (UI state)
```

---

### @backend

**Responsável por:** Lógica de negócio e APIs

#### Expertise
- DDD bounded contexts
- Repository pattern
- Supabase (auth, database, realtime)
- API routes (Next.js)
- Domain entities & aggregates

#### Tipos de Tarefa
- Ajustar FSM de pedido
- Criar/atualizar API routes
- Implementar repository methods
- Domain events

#### Arquivos Típicos
```
src/domain/
src/application/
src/infrastructure/
src/app/api/
```

---

### @qa

**Responsável por:** Testes e qualidade

#### Expertise
- Playwright E2E
- Vitest unit/integration
- Coverage analysis
- Regression testing

#### Tipos de Tarefa
- Escrever testes E2E
- Verificar cobertura de testes
- Executar build e verificar
- Code review de testes

#### Arquivos Típicos
```
tests/
playwright.config.ts
vitest.config.ts
```

---

### @explorer

**Responsável por:** Análise de código e research

#### Expertise
- Análise de código existente
- Arquitetura de software
- Refatoração
- Documentação técnica

#### Tipos de Tarefa
- Mapear código existente
- Identificar refatorações necessárias
- Analisar dependências
- Criar documentação técnica

---

## Workflow SDD Completo

```
1. DEMANDA DO USUÁRIO
   │
   ▼
2. ORCHESTRATOR CRIA SDD
   ├── proposal.md      (intent, scope, risks)
   ├── specs/X/spec.md  (RFC 2119, Gherkin)
   ├── specs/X/design.md (arquitetura, arquivos)
   └── specs/X/tasks.md (checklist executável)
   │
   ▼
3. TASKS DISTRIBUÍDAS VIA ISSUES
   └── issues/open/YYYY-MM-DD-{role}-{desc}.md
   │
   ▼
4. AGENTS EXECUTAM
   ├── Agent pega issue → in_progress/
   ├── Executa trabalho
   ├── Retorna resultado (envelope)
   └── Issue → review/ → done/
   │
   ▼
5. ORCHESTRATOR VERIFICA
   ├── npm run build
   ├── npm run test
   └── npm run lint
   │
   ▼
6. VERIFY-REPORT + ARCHIVE
   └── verify-report.md
```

---

## Formato de Issue

```markdown
# Issue: [Título]

**De:** @orchestrator
**Para:** @[agente]
**Label:** `frontend|backend|qa|explorer`
**Priority:** `high|medium|low`
**Blocking:** `true|false`
**SDD:** `nome-da-spec`
**Task Ref:** `1.1, 1.2`

## Descrição
[O que precisa ser feito]

## Contexto
[Por que isso é necessário]

## Critérios de Aceitação
- [ ] Critério 1
- [ ] Critério 2

## Arquivos
- `src/app/...`
- `src/components/...`

## Dependências
- Issue #X (precisa ser concluído antes)

---
**Status:** open
**Criado:** YYYY-MM-DD
```

---

## Formato de Task (tasks.md)

```markdown
## Fase X: Nome da Fase

### X.1 Nome da Task

- [ ] X.1.1 Sub-task 1
- [ ] X.1.2 Sub-task 2

### X.2 Nome da Task

- [ ] X.2.1 Sub-task 1
```

### Estados de Task

| Estado | Símbolo | Significado |
|--------|---------|-------------|
| Pendente | `- [ ]` | Aguardando execução |
| Em progresso | `- [~]` | Agent executando |
| Completo | `- [x]` | Executado e verificado |
| Bloqueado | `- [-]` | Impedido por dependência |

---

## Return Envelope (do agent para orchestrator)

Todo agent **DEVE** retornar este formato após executar:

```markdown
## Task Result

**Status**: completed | failed | partial
**Task**: {número e nome da task}

### What was done
- {mudança concreta 1}
- {mudança concreta 2}

### Files changed
- `path/to/file.ts` — {o que mudou}

### Verification
- `build`: passed | failed
- `tests`: passed | failed
- `lint`: passed | failed

### Issues (if any)
- {descrição} — {critical | important | minor}

### Failure reason (if failed)
{Por que falhou, o que foi tentado, o que bloqueou}

### Skip reason (if skipped)
{Por que foi pulado, pré-requisito faltando}
```

---

## Regras de Comunicação

### Issues
- Issues são criados em `issues/open/`
- Agent move para `issues/in_progress/` ao iniciar
- Após executar, move para `issues/review/`
- Se OK, orchestrator move para `issues/done/`

### Tasks
- Orchestrator marca `- [~]` antes de dispatch
- Agent retorna resultado
- Orchestrator marca `- [x]` após verificar

### Progress
- Orchestrator mantém `tasks.md` atualizado
- Agents NÃO modificam `tasks.md`
- Agents só devolvem envelope de resultado

---

## Priorização

| Prioridade | Quando Usar |
|------------|-------------|
| `high` + `blocking: true` | Pré-requisito para outras |
| `high` | Core functionality do MVP |
| `medium` | Features importantes |
| `low` | Nice-to-have |

---

##SDDs do MVP Multica

| SDD | Status | Descrição |
|-----|--------|-----------|
| checkout-sem-pagamento | pending | Checkout → KDS sem pagamento |
| kds-mvp | pending | Kitchen Display System |
| cardapio-publico | pending | Rota /r/[slug] pública |
| acompanhamento-pedido | pending | Página de tracking |
| qr-code-mesa | pending | Validação de QR e mesa |

---

## Referências

| Arquivo | Descrição |
|---------|-----------|
| `ORCHESTRATOR.md` | Definição completa do orchestrator |
| `ROLES.md` | Papéis detalhados dos agents |
| `issues/README.md` | Sistema de issues |
| `skills/executing-plans/` | Skill de execução de planos |
