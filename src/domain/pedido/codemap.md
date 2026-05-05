# Pedido — Bounded Context

> Domínio que gerencia o ciclo de vida de pedidos

## Visão Geral

O contexto de **Pedido** é responsável por:
- Criar e gerenciar pedidos
- Controlar status do pedido (FSM)
- Calcular totais
- Gerenciar itens do pedido
- Publicar eventos de domínio

## Estrutura

```
src/domain/pedido/
├── entities/
│   ├── Pedido.ts           # Entidade principal (Aggregate Root)
│   └── ItemPedido.ts       # Item do pedido
├── value-objects/
│   ├── StatusPedido.ts     # Status: pending, confirmed, preparing, ready, delivered
│   ├── Dinheiro.ts         # Valor monetário com operações
│   ├── MetodoPagamento.ts  # pix, cartao
│   └── ModificadorSelecionado.ts
├── aggregates/
│   ├── PedidoAggregate.ts  # Agregado do pedido
│   └── CarrinhoAggregate.ts # Carrinho (para conversão em pedido)
├── events/
│   ├── PedidoCriadoEvent.ts
│   ├── PedidoStatusAlteradoEvent.ts
│   └── PagamentoConfirmadoEvent.ts
├── repositories/
│   ├── IPedidoRepository.ts
│   └── ICarrinhoRepository.ts
└── services/
    └── CalculadoraTotal.ts
```

## Entidades

### Pedido (Aggregate Root)

```typescript
class Pedido {
  id: string;
  clienteId: string;
  mesaId: string;
  restauranteId: string;
  status: StatusPedido;
  itens: ItemPedido[];
  total: Dinheiro;
  criadoEm: Date;
  atualizadoEm: Date;
}
```

**Métodos:**
- `criar()` - Factory method
- `adicionarItem()` - Adiciona item ao pedido
- `removerItem()` - Remove item do pedido
- `atualizarStatus()` - Atualiza status (com validação FSM)
- `calcularTotal()` - Recalcula total
- `getTransicoesPermitidas()` - Retorna transições válidas

### ItemPedido

```typescript
class ItemPedido {
  id: string;
  pedidoId: string;
  produtoId: string;
  nome: string;
  precoUnitario: Dinheiro;
  quantidade: number;
  modificadoresSelecionados: ModificadorSelecionado[];
  subtotal: Dinheiro;
}
```

## Status FSM

```
pending → confirmed → preparing → ready → delivered
    ↓         ↓          ↓
  cancelled  cancelled  cancelled
```

| Status | Descrição |
|--------|-----------|
| `pending` | Aguardando pagamento |
| `confirmed` | Pagamento confirmado |
| `preparing` | Em preparo na cozinha |
| `ready` | Pronto para entrega |
| `delivered` | Entregue ao cliente |
| `cancelled` | Cancelado |

## Eventos de Domínio

| Evento | Quando |
|--------|--------|
| `PedidoCriadoEvent` | Novo pedido criado |
| `PedidoStatusAlteradoEvent` | Status mudou |
| `PagamentoConfirmadoEvent` | Pagamento aprovado |

## Repositórios

### IPedidoRepository

```typescript
interface IPedidoRepository {
  create(pedido: Pedido): Promise<void>;
  findById(id: string): Promise<Pedido | null>;
  findByClienteId(clienteId: string): Promise<Pedido[]>;
  findByMesaId(mesaId: string): Promise<Pedido[]>;
  update(pedido: Pedido): Promise<void>;
  delete(id: string): Promise<void>;
}
```

## Dependências

Este módulo **não pode** importar de:
- `src/application/`
- `src/infrastructure/`
- `src/presentation/`
- `next/`, `react/`, etc.

## Relacionamento com Outros Contextos

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Pedido     │ ──▶ │  Pagamento  │ ◀── │   Cliente   │
│             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │                   │
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│   Cardapio  │     │    Mesa     │
│             │     │             │
└─────────────┘     └─────────────┘
```

## Status de Implementação

| Componente | Status |
|------------|--------|
| Entities | ✅ Implementado |
| Value Objects | ✅ Implementado |
| Aggregates | ✅ Implementado |
| Events | ✅ Implementado |
| Repository Interfaces | ✅ Implementado |
| Domain Services | ✅ Implementado |

---

*Criado: 2026-05-04*
