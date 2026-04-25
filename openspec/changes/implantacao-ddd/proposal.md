# Proposal: Implementação de Arquitetura DDD

## Intent

Estabelecer a arquitetura Domain-Driven Design (DDD) em todo o projeto Pedi-AI, migrando a estrutura atual para as camadas `domain/`, `application/`, `infrastructure/` e `presentation/`, garantindo que todas as regras de negócio fiquem isoladas de frameworks e testáveis.

## Scope

### In Scope

- Criar a estrutura de diretórios DDD em `src/`
- Mapear os bounded contexts existentes (pedido, cardápio, mesa, pagamento, autenticação, admin)
- Criar a camada `domain/` com:
  - Entities (Pedido, ItemCardapio, Mesa, Usuario, Pagamento)
  - Value Objects (Dinheiro, Quantidade, StatusPedido, etc.)
  - Aggregates (PedidoAggregate, CarrinhoAggregate)
  - Domain Events (PedidoCriado, PagamentoConfirmado, etc.)
  - Domain Services
  - Repository interfaces
- Criar a camada `application/` com use cases
- Criar a camada `infrastructure/` com implementações (Dexie/IndexedDB)
- Criar a camada `presentation/` reorganizando componentes existentes
- Atualizar imports em todo o projeto

### Out of Scope

- Reescrever lógica de negócio existente (apenas reorganizar)
- Criar novos funcionalidades
- Alterar APIs externas ou integrações existentes
- Modificar a estrutura de testes (E2E, integração)

## Approach

### Fase 1: Criação da Estrutura Base
```
src/
├── domain/
│   ├── shared/           # Types, utils compartilhados
│   ├── pedido/           # Bounded context de pedidos
│   ├── cardapio/         # Bounded context de cardápio
│   ├── mesa/             # Bounded context de mesas
│   ├── pagamento/        # Bounded context de pagamentos
│   ├── autenticacao/     # Bounded context de autenticação
│   └── admin/            # Bounded context de administração
├── application/
│   └── [bounded-context]/services/
├── infrastructure/
│   ├── persistence/      # Dexie implementations
│   └── external/         # APIs externas
└── presentation/
    ├── pages/
    ├── components/
    └── hooks/
```

### Fase 2: Mapeamento de Bounded Contexts

| Bounded Context | Specs Existentes | Entidades Principais |
|-----------------|------------------|---------------------|
| `pedido` | order, cart | Pedido, ItemPedido, Carrinho |
| `cardapio` | menu, combos, modifier-groups | ItemCardapio, Categoria, Combo, Modificador |
| `mesa` | table | Mesa |
| `pagamento` | payment | Pagamento, Transacao |
| `autenticacao` | auth, register | Usuario, Sessao |
| `admin` | admin | ---

### Fase 3: Implementação Incremental

1. **Criar apenas tipos e interfaces** no domain (sem lógica ainda)
2. **Mover entidades existentes** para domain/
3. **Criar repository interfaces** em domain/
4. **Implementar use cases** em application/
5. **Reimplementar infraestrutura** (Dexie) contra interfaces
6. **Refatorar presentation/** para usar application/

### Fase 4: Migração de Presentation

- Components que têm lógica de negócio extraem para domain/
- Pages ficam apenas com renderização e coleta de input
- Hooks customizados migram para use cases em application/

## Affected Areas

- `src/` — toda a codebase frontend
- `openspec/specs/` — specs existentes serão reorganizadas por bounded context
- `AGENTS.md` — já atualizado com regras DDD

## Risks

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Breaking changes em produção | Alto | Manter API contracts estáveis; testar E2E antes de deploy |
| Delta de migração muito grande | Médio | Fazer migração incremental por bounded context |
| Duplicação de código durante transição | Médio | Revisão de código e linting rigoroso |
| Performance degrade com novas abstrações | Baixo | Profile antes/depois; abstrações apenas onde necessário |

## Rollback Plan

1. Manter branch `feature/ddd` ativa durante toda a migração
2. Merge parcial por bounded context (Pedido → Cardápio → Mesa → etc.)
3. Se rollback necessário: revert do merge commit do bounded context afetado
4. Manter código antigo commented-by-default por 2 sprints antes de deletar

## Success Criteria

- [ ] 100% do código de domínio (entities, value objects, aggregates, events, services) em `src/domain/`
- [ ] 100% dos use cases em `src/application/`
- [ ] 100% das implementações de infraestrutura em `src/infrastructure/`
- [ ] `src/presentation/` contém APENAS renderização e coleta de input
- [ ] domain/ não tem imports de Next.js, React, ou bibliotecas de infra
- [ ] Testes unitários passam com cobertura ≥ 80%
- [ ] Todos os testes E2E existentes passam
- [ ] Zero breaking changes na API pública (pages, API routes)