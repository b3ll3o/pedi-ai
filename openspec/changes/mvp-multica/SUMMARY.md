# MVP Multica — Quick Reference

## O que é

MVP de cardápio digital: cliente escaneia QR, faz pedido, paga presencialmente.

---

## Estrutura de Pastas

```
openspec/changes/mvp-multica/
├── AGENTS.md              # Sistema completo de agentes
├── ORCHESTRATOR.md        # Definição do orchestrator
├── ROLES.md              # Papéis dos agents
├── README.md             # Este resumo
├── proposal.md           # Proposta do MVP
├── tasks.md             # Tasks globais
├── specs/               # SDDs do MVP
│   ├── checkout-sem-pagamento/
│   ├── kds-mvp/
│   ├── cardapio-publico/
│   ├── acompanhamento-pedido/ (pendente)
│   └── qr-code-mesa/ (pendente)
└── issues/              # Issues entre agents
    ├── open/
    ├── in_progress/
    ├── review/
    ├── done/
    └── blocked/
```

---

## Como Começar

1. **Leia AGENTS.md** — Entenda o sistema de agentes
2. **Veja tasks.md** — Quais SDDs precisamos implementar
3. **Crie issues** — Orchestrator distribui trabalho

---

## SDDs do MVP

| SDD | Status | Prioridade |
|-----|--------|-----------|
| checkout-sem-pagamento | ✅ Spec+Design+Tasks | High |
| kds-mvp | ✅ Spec+Design+Tasks | High |
| cardapio-publico | ✅ Spec+Design+Tasks | Medium |
| acompanhamento-pedido | ⏳ Pending | Medium |
| qr-code-mesa | ⏳ Pending | Low |

---

## Workflow

```
1. Orchestrator cria SDD (specs/ + design.md + tasks.md)
       ↓
2. Distribui tasks via issues/open/
       ↓
3. Agent executa → issues/in_progress/ → issues/done/
       ↓
4. Orchestrator verifica (build, test, lint)
```

---

## Agentes

| Agent | Especialidade |
|-------|---------------|
| @orchestrator | Coordenação, SDD |
| @frontend | UI, components |
| @backend | Domain, APIs |
| @qa | Tests |
| @explorer | Analysis |

---

## Labels de Issues

| Label | Uso |
|-------|-----|
| `frontend` | UI, components |
| `backend` | APIs, domain |
| `qa` | Tests, verify |
| `explorer` | Analysis |
| `blocking` | Bloqueia outras tasks |

---

## Progresso

```
SDDs: 5 total
- 3 com spec+design+tasks ✅
- 2 pendentes ⏳
```

---

## Comandos Úteis

```bash
# Ver SDDs
ls specs/

# Ver tasks pendentes
grep "\- \[ \]" specs/*/tasks.md

# Ver issues em aberto
ls issues/open/
```

---

## Dúvidas?

1. Sistema de agentes → `AGENTS.md`
2. Como orchestrator trabalha → `ORCHESTRATOR.md`
3. Papéis → `ROLES.md`
4. Issues → `issues/README.md`
