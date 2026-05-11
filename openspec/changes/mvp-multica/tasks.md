# Tasks — MVP Multica

## Visão Geral

Tasks globais do MVP. Tasks específicas de cada SDD estão em `specs/[sdd-name]/tasks.md`.

---

## SDDs do MVP

| SDD | Tasks | Status |
|-----|-------|--------|
| checkout-sem-pagamento | `specs/checkout-sem-pagamento/tasks.md` | done |
| kds-mvp | `specs/kds-mvp/tasks.md` | pending |
| cardapio-publico | `specs/cardapio-publico/tasks.md` | pending |
| acompanhamento-pedido | `specs/acompanhamento-pedido/tasks.md` | pending |
| qr-code-mesa | `specs/qr-code-mesa/tasks.md` | pending |

---

## Fase 0: Análise de Changes

### 0.1 Analisar changes do projeto

- [ ] Listar todas as changes em `openspec/changes/`
- [ ] Verificar status de cada uma
- [ ] Criar `openspec/changes/STATUS.md`
- [ ] Identificar blockers

### 0.2 Configurar estrutura de issues

- [x] Issues folder structure
- [x] Agentes-config

---

## Fase 1: Configuração Inicial do MVP

### 1.1 Analisar código existente

- [ ] Analisar KDS atual em `/kitchen`
- [ ] Analisar checkout atual em `(customer)/checkout`
- [ ] Analisar `useCartStore`
- [ ] Mapear `DEMO_RESTAURANT_ID`

---

## Progresso Total

```
Total de SDDs: 5
Completos: 0 (specs criadas, implementação pending)
Em progresso: 0
Pendentes: 5
```

---

## Como Usar Este Documento

1. Tasks globais estão aqui
2. Tasks específicas de cada SDD estão em `specs/[nome]/tasks.md`
3. Issues em `issues/` são criados pelo orchestrator

---

## Task Metadata

```yaml
change: mvp-multica
version: 1.0.0
created: 2026-05-11
owner: @orchestrator
```
