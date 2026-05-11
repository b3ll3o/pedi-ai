# MVP Multica — Cardápio Digital com Pedido na Mesa

## O que é

MVP de cardápio digital onde:
- Cliente escaneia QR code na mesa
- Faz pedido pelo celular
- Pagamento é presencial (sem pagamento online)
- Cozinha recebe via KDS

---

## Quick Start

| Para... | Leia... |
|---------|---------|
| Entender o MVP | Este README |
| Sistema de agentes | `AGENTS.md` |
| Como orchestrator trabalha | `ORCHESTRATOR.md` |
| Papéis dos agents | `ROLES.md` |
| Issues entre agents | `issues/README.md` |
| Tasks pendentes | `tasks.md` |

---

## Estrutura

```
openspec/changes/mvp-multica/
├── README.md          # Este arquivo
├── AGENTS.md          # Sistema completo de agentes
├── ORCHESTRATOR.md    # Definição do orchestrator
├── ROLES.md          # Papéis dos agents
├── proposal.md       # Proposta do MVP
├── tasks.md          # Tasks globais
├── specs/            # SDDs do MVP
│   └── checkout-sem-pagamento/
│       ├── spec.md
│       ├── design.md
│       └── tasks.md
└── issues/           # Issues entre agents
    ├── open/
    ├── in_progress/
    ├── review/
    ├── done/
    └── blocked/
```

---

## SDDs do MVP

| SDD | Status | Descrição |
|-----|--------|-----------|
| checkout-sem-pagamento | done | Checkout sem etapa de pagamento |
| kds-mvp | pending | Kitchen Display System |
| cardapio-publico | pending | Rota /r/[slug] |
| acompanhamento-pedido | pending | Página de tracking |
| qr-code-mesa | pending | Validação QR |

---

## Workflow

```
1. USUÁRIO pede algo
       ↓
2. @orchestrator cria SDD (proposal → spec → design → tasks)
       ↓
3. Distribui tasks via issues (open → in_progress → done)
       ↓
4. Agents executam (@frontend, @backend, @qa, @explorer)
       ↓
5. @orchestrator verifica (build, test, lint)
       ↓
6. Entrega (verify-report.md)
```

---

## Comandos

```bash
# Ver tasks pendentes
grep "\- \[ \]" tasks.md

# Ver progresso
grep -c "\- \[x\]" tasks.md

# Listar issues em aberto
ls issues/open/

# Ver SDDs
ls specs/
```

---

## Referências dos Agentes

| Agente | Especialidade | Documento |
|--------|---------------|-----------|
| @orchestrator | Coordenação, SDD | `ORCHESTRATOR.md` |
| @frontend | UI, components | `ROLES.md` |
| @backend | Domain, APIs | `ROLES.md` |
| @qa | Tests, verification | `ROLES.md` |
| @explorer | Analysis | `ROLES.md` |

---

## Progresso

```
Fase 0: Análise de Changes          [  0%]
Fase 1: Configuração Inicial        [  0%]
Fase 2: Checkout sem Pagamento      [  0%]
Fase 3: KDS                         [  0%]
Fase 4: Cardápio Público            [  0%]
Fase 5: Acompanhamento de Pedido    [  0%]
Fase 6: Testes E2E                 [  0%]
Fase 7: Ajustes Finais             [  0%]
```
