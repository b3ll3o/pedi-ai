# Spec for Order Domain

## ADDED Requirements

### Requirement: Order Creation
The system SHALL allow customers to create orders from their cart contents.

#### Scenario: Create Order from Cart
- GIVEN the customer has a cart with items and has selected a payment method
- WHEN the customer confirms the order
- THEN the system SHALL create an order record with status `pending_payment`
- AND the order SHALL contain all cart items as order_items
- AND the order SHALL reference the table_id from the QR code scan
- AND the order SHALL reference the restaurant_id from the QR code scan
- AND the order SHALL record the total amount

#### Scenario: Order Passed to Kitchen
- GIVEN an order has been created and payment has been confirmed
- WHEN the payment webhook updates the order status to `paid`
- THEN the system SHALL update the order status to `received`
- AND the system SHALL emit a realtime event for waiter notification

#### Scenario: Order Status Update by Waiter
- GIVEN a waiter has received a new order notification
- WHEN the waiter accepts the order
- THEN the system SHALL update the order status to `preparing`
- AND the system SHALL record the status change in order_status_history with the waiter's ID

#### Scenario: Order Status Rejection
- GIVEN a waiter has received a new order notification
- WHEN the waiter rejects the order with a reason
- THEN the system SHALL update the order status to `rejected`
- AND the system SHALL record the rejection reason
- AND the system SHALL notify the customer of the rejection

#### Scenario: Order Ready for Delivery
- GIVEN an order is being prepared
- WHEN the kitchen marks the order as ready
- THEN the system SHALL update the order status to `ready`
- AND the system SHALL emit a realtime event for waiter notification

#### Scenario: Order Delivered
- GIVEN an order is ready for delivery
- WHEN the waiter marks the order as delivered
- THEN the system SHALL update the order status to `delivered`
- AND the system SHALL record the delivery timestamp

### Requirement: Order History
The system SHALL provide customers access to their order history.

#### Scenario: View Order History
- GIVEN the customer has completed orders
- WHEN the customer navigates to order history
- THEN the system SHALL display all orders for the customer's account
- AND each order SHALL display order date, status, items summary, and total
- AND orders SHALL be sorted by date descending

#### Scenario: View Order Detail
- GIVEN the customer has selected an order from history
- WHEN the system loads the order detail view
- THEN the system SHALL display all order items with modifiers and prices
- AND the system SHALL display the order status history with timestamps
- AND the system SHALL display payment information

#### Scenario: Reorder from History
- GIVEN the customer is viewing a past order
- WHEN the customer clicks "Reorder"
- THEN the system SHALL add all items from that order to the current cart
- AND the customer SHALL be navigated to the cart view

### Requirement: Kitchen Display
The system SHALL provide a kitchen display view for pending orders.

#### Scenario: Kitchen Display Shows Pending Orders
- GIVEN the kitchen staff has access to the kitchen display
- WHEN the kitchen display loads
- THEN the system SHALL display all orders with status `received` or `preparing`
- AND orders SHALL be sorted by creation time (oldest first)
- AND each order SHALL display table number, items, modifiers, and elapsed time

#### Scenario: Kitchen Updates Order Status
- GIVEN the kitchen staff is viewing an order on the kitchen display
- WHEN the kitchen staff marks the order as ready
- THEN the system SHALL update the order status to `ready`
- AND the kitchen display SHALL remove the order from the active list

### Requirement: Order Status State Machine (FSM)
O sistema DEVE implementar uma máquina de estados finitos para controlar transições de status de pedidos, garantindo que apenas transições válidas sejam permitidas.

#### Scenario: Valid Status Transition Flow
- GIVEN um pedido está em qualquer status válido
- WHEN uma transição de status é solicitada
- THEN o sistema SHALL validar a transição contra o mapa de transições permitidas
- AND apenas transições definidas no mapa são aceitas

O fluxo principal de status é:
```
pending_payment → paid → received → preparing → ready → delivered
```

Cancelamento pode ocorrer a partir de `pending_payment`, `paid`, `received`, `preparing`, ou `ready`:
```
pending_payment → cancelled
paid → cancelled
received → cancelled
preparing → cancelled
ready → cancelled
```

Estados rejeitados (`rejected`), falha de pagamento (`payment_failed`) e reembolsados (`refunded`) são terminais (sem transições saindo deles).

#### Scenario: Invalid Status Transition Rejected
- GIVEN um pedido está no status `delivered` ou `cancelled`
- WHEN qualquer tentativa de mudança de status é feita
- THEN o sistema SHALL rejeitar a transição
- AND retornar `false` para transições inválidas

#### Scenario: Get Allowed Transitions
- GIVEN o sistema precisa exibir as opções de status disponíveis
- WHEN uma consulta é feita para um status específico
- THEN o sistema SHALL retornar lista de status destino válidos
- AND `delivered` e `cancelled` retornam lista vazia (estados terminais)

#### Scenario: Order Age Detection for Kitchen Display
- GIVEN a cozinha precisa identificar pedidos que estão há muito tempo em preparo
- WHEN um pedido está em `received` ou `preparing` por mais de 5 minutos
- THEN o sistema SHALL marcar o pedido como `stale` (estale)
- AND o sistema SHALL exibir alerta visual de tempo excedido

#### Funções Relacionadas (Implementação em `src/domain/pedido/entities/Pedido.ts`)

| Função | Descrição |
|--------|-----------|
| `TRANSICOES_VALIDAS` | Mapa de transições válidas em `Pedido.ts:9-20` |
| `alterarStatus(novoStatus)` | Valida e aplica transição de status (lança erro se inválida) |

**Mapa de transições implementadas:**
```typescript
const TRANSICOES_VALIDAS = {
  pending_payment: ['paid', 'payment_failed', 'cancelled'],
  paid: ['received', 'cancelled', 'rejected', 'refunded'],
  received: ['preparing', 'cancelled', 'rejected'],
  preparing: ['ready', 'cancelled', 'rejected'],
  ready: ['delivered', 'cancelled', 'rejected'],
  delivered: [],
  cancelled: [],
  payment_failed: [],
  refunded: [],
  rejected: [],
}
```

### Requirement: Waiter Order Notifications
The system SHALL provide real-time notifications to waiters for new orders.

#### Scenario: Waiter Receives New Order Alert
- GIVEN a waiter is logged in and connected to realtime
- WHEN a new order is placed and paid
- THEN the waiter SHALL receive a notification within 5 seconds
- AND the notification SHALL include table number and order total
- AND the waiter dashboard SHALL update to show the new order

#### Scenario: Waiter Connection Loss Fallback
- GIVEN a waiter has an active session but realtime connection is lost
- WHEN the connection is lost
- THEN the system SHALL fall back to polling every 10 seconds
- AND the system SHALL display a connection status indicator

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.

---

## DDD Architecture Requirements (from implantacao-ddd)

### Requirement: Pedido Domain Layer — Entities
The domain layer MUST contain the following entities with identity and business logic isolated from frameworks.

#### Scenario: Pedido Entity Exists
- GIVEN the `src/domain/pedido/entities/` directory
- WHEN the codebase is inspected
- THEN a `Pedido.ts` entity MUST exist with properties: `id`, `clienteId`, `mesaId`, `restauranteId`, `status`, `itens`, `total`, `createdAt`, `updatedAt`
- AND the entity MUST contain domain methods for status transitions
- AND the entity MUST NOT import from Next.js, React, or infrastructure layers

#### Scenario: ItemPedido Entity Exists
- GIVEN the `src/domain/pedido/entities/` directory
- WHEN the codebase is inspected
- THEN a `ItemPedido.ts` entity MUST exist with properties: `id`, `pedidoId`, `produtoId`, `nome`, `precoUnitario`, `quantidade`, `modificadoresSelecionados`, `subtotal`
- AND the entity MUST represent a line item in an order

### Requirement: Pedido Domain Layer — Value Objects
The domain layer MUST contain value objects representing immutable domain concepts.

#### Scenario: StatusPedido Value Object Exists
- GIVEN the `src/domain/pedido/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `StatusPedido.ts` value object MUST exist with allowed values: `pending_payment`, `paid`, `received`, `preparing`, `ready`, `delivered`, `rejected`, `cancelled`, `refunded`
- AND the value object MUST be immutable

#### Scenario: Dinheiro Value Object (from Shared)
- GIVEN the `Pedido` aggregate needs monetary values
- WHEN inspecting imports
- THEN `Dinheiro` SHALL be imported from `@/domain/shared/value-objects/Dinheiro`
- AND NOT from `@/domain/pedido/value-objects/` (it was moved to shared)

#### Scenario: MetodoPagamento Value Object (from Pagamento)
- GIVEN the `CarrinhoAggregate` needs to reference payment method
- WHEN inspecting imports
- THEN `MetodoPagamento` SHALL be imported from `@/domain/pagamento/value-objects/MetodoPagamento`
- AND the `pagamento` context is the owner of this value object

### Requirement: Pedido Domain Layer — Aggregates
The domain layer MUST contain aggregate roots that encapsulate invariants.

#### Scenario: PedidoAggregate Exists
- GIVEN the `src/domain/pedido/aggregates/` directory
- WHEN the codebase is inspected
- THEN a `PedidoAggregate.ts` aggregate root MUST exist
- AND the aggregate MUST contain the `Pedido` entity and its `ItemPedido` collection
- AND the aggregate MUST enforce invariants: order must have at least one item, total must match sum of item subtotals
- AND status transitions MUST be validated against allowed transitions

#### Scenario: CarrinhoAggregate Exists
- GIVEN the `src/domain/pedido/aggregates/` directory
- WHEN the codebase is inspected
- THEN a `CarrinhoAggregate.ts` aggregate root MUST exist
- AND the aggregate MUST manage cart items and validate cart operations
- AND the aggregate MUST provide a `toPedido()` method to convert cart to order

### Requirement: Pedido Domain Layer — Repository Interfaces
The domain layer MUST define repository interfaces as contracts.

#### Scenario: IPedidoRepository Interface Exists
- GIVEN the `src/domain/pedido/repositories/` directory
- WHEN the codebase is inspected
- THEN an `IPedidoRepository.ts` interface MUST exist with methods: `create(pedido)`, `findById(id)`, `findByClienteId(clienteId)`, `findByMesaId(mesaId)`, `update(pedido)`, `delete(id)`
- AND the interface MUST NOT depend on any infrastructure implementation

#### Scenario: ICarrinhoRepository Interface Exists
- GIVEN the `src/domain/pedido/repositories/` directory
- WHEN the codebase is inspected
- THEN an `ICarrinhoRepository.ts` interface MUST exist with methods: `get(clienteId)`, `save(carrinho)`, `clear(clienteId)`
- AND the interface MUST define persistence contract for cart data

### Requirement: Pedido Domain Layer — Domain Events
The domain layer MUST define domain events as immutable records.

#### Scenario: Domain Events Exist
- GIVEN the `src/domain/pedido/events/` directory
- WHEN the codebase is inspected
- THEN `PedidoCriadoEvent.ts`, `PedidoStatusAlteradoEvent.ts` event classes MUST exist
- AND `PagamentoConfirmadoEvent` SHALL NOT exist in pedido (it belongs to `pagamento` context)
- AND each event MUST contain `occurredAt` timestamp and relevant payload
- AND events MUST be serializable for infrastructure handling

#### Scenario: Pedido Consumes PagamentoConfirmadoEvent
- GIVEN the `pedido` context needs to react to payment confirmation
- WHEN handling payment confirmation
- THEN it SHALL consume `PagamentoConfirmadoEvent` from `@/domain/pagamento/events/`
- AND it SHALL NOT define its own payment confirmation event

### Requirement: Pedido Application Layer — Use Cases
The application layer MUST contain use case services that orchestrate domain logic.

#### Scenario: CriarPedido Use Case Exists
- GIVEN the `src/application/pedido/services/` directory
- WHEN the codebase is inspected
- THEN a `CriarPedidoUseCase.ts` class MUST exist
- AND it MUST accept cart data, create a PedidoAggregate, persist via IPedidoRepository, and emit domain events
- AND it MUST NOT contain domain logic itself (delegates to domain entities)

#### Scenario: AlterarStatusPedido Use Case Exists
- GIVEN the `src/application/pedido/services/` directory
- WHEN the codebase is inspected
- THEN an `AlterarStatusPedidoUseCase.ts` class MUST exist
- AND it MUST validate status transitions via PedidoAggregate and persist changes

#### Scenario: ObterHistoricoPedidos Use Case Exists
- GIVEN the `src/application/pedido/services/` directory
- WHEN the codebase is inspected
- THEN an `ObterHistoricoPedidosUseCase.ts` class MUST exist
- AND it MUST retrieve orders via IPedidoRepository for a given clienteId

### Requirement: Pedido Infrastructure Layer — Persistence
The infrastructure layer MUST implement repository interfaces using Dexie/IndexedDB.

#### Scenario: PedidoRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/pedido/` directory
- WHEN the codebase is inspected
- THEN a `PedidoRepository.ts` class MUST exist implementing `IPedidoRepository`
- AND it MUST use Dexie database for IndexedDB persistence
- AND it MUST handle serialization/deserialization of domain entities

#### Scenario: CarrinhoRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/pedido/` directory
- WHEN the codebase is inspected
- THEN a `CarrinhoRepository.ts` class MUST exist implementing `ICarrinhoRepository`
- AND it MUST persist cart data to IndexedDB for offline access

### Requirement: Pedido Presentation Layer — Boundaries
The presentation layer MUST only contain UI rendering and input collection.

#### Scenario: Presentation Layer Has No Domain Logic
- GIVEN the `src/presentation/` directory
- WHEN the codebase is inspected
- THEN pages and components MUST NOT contain business logic
- AND all business logic MUST be delegated to use cases in `src/application/pedido/services/`

#### Scenario: Cart Hooks Delegate to Application Layer
- GIVEN `src/presentation/hooks/` contains cart-related hooks
- WHEN the hooks are inspected
- THEN each hook MUST call use cases from `src/application/pedido/services/`
- AND the hooks MUST NOT contain domain logic, validation, or state management beyond UI state

### Requirement: Pedido Dependency Rules
The system MUST enforce unidirectional dependency flow between layers.

#### Scenario: Domain Has No External Dependencies
- GIVEN any file in `src/domain/pedido/`
- WHEN imports are inspected
- THEN NO import from `src/application/`, `src/infrastructure/`, or `src/presentation/` MUST exist
- AND imports MUST be limited to TypeScript built-ins and shared domain utilities

#### Scenario: Application Depends Only on Domain
- GIVEN any file in `src/application/pedido/`
- WHEN imports are inspected
- THEN imports MUST only reference `src/domain/pedido/` interfaces and types
- AND infrastructure implementations MUST be injected via constructor injection