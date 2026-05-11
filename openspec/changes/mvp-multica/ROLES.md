# ROLES.md — Papéis dos Agentes

## Visão Geral

Cada agente tem responsabilidades específicas. Agentes se comunicam via issues em `issues/`.

**Documento principal:** `AGENTS.md` — contém sistema completo de agentes.

---

## Agentes

| Agente | Papel | Responde para |
|--------|-------|---------------|
| `@orchestrator` | Coordenação, SDD | Usuário |
| `@frontend` | UI, Components | @orchestrator |
| `@backend` | Domain, APIs | @orchestrator |
| `@qa` | Tests, Verification | @orchestrator |
| `@explorer` | Analysis, Research | @orchestrator |

---

## @frontend

**Quando chamar:** Tasks de UI, components, páginas

### Expertise
- Next.js 16 App Router
- React components
- CSS/Tailwind (mobile-first)
- Hooks de UI
- Zustand stores

### Arquivos Típicos
```
src/app/
src/components/
src/hooks/ (UI)
src/stores/ (UI)
```

---

## @backend

**Quando chamar:** Tasks de lógica de negócio, APIs, domain

### Expertise
- DDD bounded contexts
- Repository pattern
- Supabase
- API routes
- Domain entities & aggregates

### Arquivos Típicos
```
src/domain/
src/application/
src/infrastructure/
src/app/api/
```

---

## @qa

**Quando chamar:** Tasks de testes, verificação, coverage

### Expertise
- Playwright E2E
- Vitest unit/integration
- Coverage analysis

### Arquivos Típicos
```
tests/
```

---

## @explorer

**Quando chamar:** Análise de código, research, mapeamento

### Expertise
- Análise de código existente
- Arquitetura de software
- Refatoração

---

## Como Agentes Comunicam

```
@orchestrator cria issue → issues/open/
        ↓
@agent pega issue → issues/in_progress/
        ↓
@agent executa
        ↓
@agent retorna envelope → issues/review/
        ↓
@orchestrator verifica → issues/done/
```

---

## Matriz de Responsabilidade

| Task | Orch | Front | Back | QA | Expl |
|------|:----:|:-----:|:----:|:--:|:----:|
| Criar SDD | ✅ | | | | |
| Coordenar | ✅ | | | | |
| UI/Components | | ✅ | | | |
| Domain/FSM | | | ✅ | | |
| Tests E2E | | | | ✅ | |
| Análise | | | | | ✅ |

---

## Convenções

### Nomenclatura de Issues
```
YYYY-MM-DD-{role}-{descricao}.md
```

### Labels
| Label | Uso |
|-------|-----|
| `frontend` | UI, components |
| `backend` | APIs, domain |
| `qa` | Tests, verify |
| `explorer` | Analysis |

### Estados de Issue
```
open → in_progress → review → done
                      ↓
                   blocked
```

---

## Progress Tracking

| Símbolo | Estado | Quem atualiza |
|---------|--------|---------------|
| `- [ ]` | Pendente | @orchestrator |
| `- [~]` | Em progresso | @orchestrator |
| `- [x]` | Completo | @orchestrator |
| `- [-]` | Bloqueado/Skip | @orchestrator |

**Agents não modificam tasks.md — só retornam envelope de resultado.**

---

## Referências

- Sistema completo: `AGENTS.md`
- Orchestrator: `ORCHESTRATOR.md`
- Issues: `issues/README.md`
