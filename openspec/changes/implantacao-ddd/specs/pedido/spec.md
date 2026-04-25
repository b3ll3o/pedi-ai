# Delta for Pedido Bounded Context

## Overview

This delta spec defines DDD layer requirements for the `pedido` bounded context, covering order and cart domains. All requirements enforce clean separation between domain logic, application use cases, infrastructure implementations, and presentation.

## ADDED Requirements

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

#### Scenario: Dinheiro Value Object Exists
- GIVEN the `src/domain/pedido/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `Dinheiro.ts` value object MUST exist with `valor` property and methods for arithmetic operations
- AND the value object MUST enforce decimal precision for monetary values

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
- THEN `PedidoCriadoEvent.ts`, `PedidoStatusAlteradoEvent.ts`, `PagamentoConfirmadoEvent.ts` event classes MUST exist
- AND each event MUST contain `occurredAt` timestamp and relevant payload
- AND events MUST be serializable for infrastructure handling

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

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
