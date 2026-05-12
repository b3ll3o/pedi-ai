# Agents Config — MVP Multica

## Papéis dos Agentes

| Agent | Especialidade | Tipo de Tarefa |
|-------|---------------|----------------|
| `@orchestrator` | Coordenação | Coordena o MVP, distribui tarefas, verifica progresso |
| `@frontend` | UI/UX, Pages | Componentes React, páginas, hooks de UI |
| `@backend` | Domain, APIs | Lógica de domínio, repositories, API routes |
| `@qa` | Testing | Testes E2E, integração, verificação |
| `@explorer` | Research | Análise de código, refatoração, decisões arquiteturais |

---

## Workflow de Issues

### Criar Issue (para outro agent)

```markdown
# Issue: [Título breve]

**De:** @agent-criador
**Para:** @agent-destino
**Label:** `frontend`
**Priority:** high | medium | low
**Blocking:** true | false

## Descrição
[O que precisa ser feito]

## Contexto
[Por que isso é necessário, links para specs, tarefas dependentes]

## Critérios de Aceitação
- [ ] Critério 1
- [ ] Critério 2

## Arquivos Prováveis
- `src/app/...`
- `src/components/...`

---
**Criado:** 2026-05-11
**Status:** open
```

### Issue Lifecycle

```
open → in_progress → review → done
                ↓
             blocked (se dependente de outro issue)
```

---

## Como Usar

### 1. Criar um Issue

O `@orchestrator` ou qualquer agent pode criar um issue:

```
Crie um issue para @frontend implementar a página de cardápio público
```

O agent cria o arquivo em `issues/YYYY-MM-DD-{slug}.md`

### 2. Assignar um Agent

No issue, especificar `@agent-destino` no campo "Para"

### 3. Agent Executa

Agent pega issue da pasta, executa, e move para `issues/done/`

### 4. Notifica Próximo

Agent cria próximo issue se houver dependência

---

## Regra de Dependências

| Prioridade | Regra |
|------------|-------|
| `blocking` | Tarefas com `blocking: true` devem ser resolvidas antes das dependentes |
| `high` | Executar antes de `medium` e `low` |
| `medium` | Executar antes de `low` |
| `low` | Executar quando não há tarefas de maior prioridade |

---

## Formato de Filename

```
YYYY-MM-DD-PED-{numero}-{tipo}-{descricao-curta}.md
```

Exemplos:
- `2026-05-11-PED-001-frontend-cardapio-publico.md`
- `2026-05-11-PED-002-backend-checkout-sem-pagamento.md`
- `2026-05-11-PED-003-qa-testes-e2e-cliente.md`
- `2026-05-11-PED-004-explorer-analise-kds.md`

### Numeração Sequencial

- Usar `PED-{numero}` com 3 dígitos (001, 002, etc.)
- Próximo número disponível: verificar maior número em `issues/` e adicionar 1
- Manter consistência: não renomear issues existentes`

---

## Pastas

```
issues/
├── README.md              # Este arquivo
├── open/                  # Issues em aberto
│   └── 2026-05-11-...
├── in_progress/          # Issues sendo executados
├── review/               # Issues em code review
├── done/                 # Issues concluídos
└── blocked/              # Issues bloqueados por dependências
```
