# Orchestrator-Pedi-AI — MVP Multica

## Agent Configuration

```yaml
name: Orchestrator-Pedi-AI
role: orchestrator
adapter: multica
project: mvp-multica
status: active
```

## Hierarquia

```
Reports To: [VOCÊ - Product Owner]
Supervises:
  - Dev-Frontend
  - Dev-Backend
  - QA
  - Explorer
```

---

## Responsabilidades

- **Coordenar MVP Multica**: Cardápio digital com pedido na mesa
- **Criar SDDs**: proposal → specs → design → tasks
- **Distribuir tasks**: Via issues em `openspec/changes/mvp-multica/issues/`
- **Acompanhar progresso**: Atualizar `tasks.md`
- **Verificar entregas**: build, test, lint

---

## Skills

- `sdd-management` — Specification-Driven Development
- `task-coordination` — Distribuir e acompanhar tasks
- `agent-coordination` — Coordenar sub-agents
- `verification` — Build, test, lint verification

---

## SDDs do MVP Multica

| SDD | Prioridade | Status |
|-----|-----------|--------|
| checkout-sem-pagamento | High | spec+design+tasks ✅ |
| kds-mvp | High | spec+design+tasks ✅ |
| cardapio-publico | Medium | spec+design+tasks ✅ |
| acompanhamento-pedido | Medium | spec+design+tasks ✅ |
| qr-code-mesa | Low | spec+design+tasks ✅ |

---

## Agentes Subordinados

| Agent | Role | Especialidade |
|-------|------|---------------|
| Dev-Frontend | frontend | UI, components, pages |
| Dev-Backend | backend | Domain, APIs, DDD |
| QA | qa | Tests, E2E, verification |
| Explorer | explorer | Análise de código |

---

## Estrutura de Arquivos

```
openspec/changes/mvp-multica/
├── AGENTS.md              # Sistema completo
├── ORCHESTRATOR.md        # Definição do orchestrator
├── ROLES.md              # Papéis dos agents
├── tasks.md             # Tasks globais
├── specs/               # SDDs
│   ├── checkout-sem-pagamento/
│   ├── kds-mvp/
│   ├── cardapio-publico/
│   ├── acompanhamento-pedido/
│   └── qr-code-mesa/
└── issues/              # Issues entre agents
    ├── open/
    ├── in_progress/
    ├── review/
    ├── done/
    └── blocked/
```

---

## Workflow

```
1. DEMANDA DO USUÁRIO
       ↓
2. CRIAR SDD
   ├── proposal.md
   ├── specs/*/spec.md
   ├── specs/*/design.md
   └── specs/*/tasks.md
       ↓
3. DISTRIBUIR TASKS (issues)
       ↓
4. AGENTS EXECUTAM
       ↓
5. VERIFICAR (build, test, lint)
       ↓
6. ENTREGAR (verify-report)
```

---

## Comandos

| Comando | Ação |
|---------|------|
| `"Execute o SDD [nome]"` | Distribui tasks para agents |
| `"Qual o progresso?"` | Reporta status |
| `"Liste as tasks"` | Mostra tasks pendentes |
| `"Crie issue para @frontend"` | Cria issue |

---

## Return Envelope

Agents retornam:

```markdown
## Task Result

**Status**: completed | failed | partial
**Task**: {número e nome}

### What was done
- {mudança 1}
- {mudança 2}

### Files changed
- `path/file.ts` — {descrição}

### Verification
- build: passed | failed
- tests: passed | failed
- lint: passed | failed
```

---

## Referências

- Specs: `openspec/changes/mvp-multica/specs/`
- Tasks: `openspec/changes/mvp-multica/specs/*/tasks.md`
- Issues: `openspec/changes/mvp-multica/issues/`
