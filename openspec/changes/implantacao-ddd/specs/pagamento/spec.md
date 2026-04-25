# Delta for Pagamento Bounded Context

## Overview

This delta spec defines DDD layer requirements for the `pagamento` bounded context, covering the payment domain. All requirements enforce clean separation between domain logic, application use cases, infrastructure implementations, and presentation.

## ADDED Requirements

### Requirement: Pagamento Domain Layer — Entities
The domain layer MUST contain payment-related entities.

#### Scenario: Pagamento Entity Exists
- GIVEN the `src/domain/pagamento/entities/` directory
- WHEN the codebase is inspected
- THEN a `Pagamento.ts` entity MUST exist with properties: `id`, `pedidoId`, `metodo` (pix/credito), `status`, `valor`, `transacaoId`, `webhookId`, `createdAt`, `confirmedAt`
- AND the entity MUST contain domain logic for status transitions
- AND the entity MUST NOT import from Next.js, React, or infrastructure layers

#### Scenario: Transacao Entity Exists
- GIVEN the `src/domain/pagamento/entities/` directory
- WHEN the codebase is inspected
- THEN a `Transacao.ts` entity MUST exist with properties: `id`, `pagamentoId`, `tipo` (charge/intent), `providerId`, `status`, `payload`, `createdAt`

### Requirement: Pagamento Domain Layer — Value Objects
The domain layer MUST contain value objects for payment concepts.

#### Scenario: MetodoPagamento Value Object Exists
- GIVEN the `src/domain/pagamento/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `MetodoPagamento.ts` value object MUST exist with values: `pix`, `credito`

#### Scenario: StatusPagamento Value Object Exists
- GIVEN the `src/domain/pagamento/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `StatusPagamento.ts` value object MUST exist with values: `pending`, `confirmed`, `failed`, `refunded`, `cancelled`

### Requirement: Pagamento Domain Layer — Aggregates
The domain layer MUST contain aggregate roots.

#### Scenario: PagamentoAggregate Exists
- GIVEN the `src/domain/pagamento/aggregates/` directory
- WHEN the codebase is inspected
- THEN a `PagamentoAggregate.ts` aggregate root MUST exist
- AND it MUST encapsulate Pagamento entity and transaction handling
- AND it MUST enforce payment status invariants

### Requirement: Pagamento Domain Layer — Repository Interfaces
The domain layer MUST define repository interfaces.

#### Scenario: IPagamentoRepository Interface Exists
- GIVEN the `src/domain/pagamento/repositories/` directory
- WHEN the codebase is inspected
- THEN an `IPagamentoRepository.ts` interface MUST exist with methods: `findById(id)`, `findByPedidoId(pedidoId)`, `save(pagamento)`, `update(pagamento)`

#### Scenario: ITransacaoRepository Interface Exists
- GIVEN the `src/domain/pagamento/repositories/` directory
- WHEN the codebase is inspected
- THEN an `ITransacaoRepository.ts` interface MUST exist with methods: `findById(id)`, `findByPagamentoId(pagamentoId)`, `save(transacao)`, `findByWebhookId(webhookId)`

### Requirement: Pagamento Domain Layer — Domain Events
The domain layer MUST define domain events.

#### Scenario: Domain Events Exist
- GIVEN the `src/domain/pagamento/events/` directory
- WHEN the codebase is inspected
- THEN `PagamentoConfirmadoEvent.ts`, `PagamentoFalhouEvent.ts`, `ReembolsoIniciadoEvent.ts`, `ReembolsoConfirmadoEvent.ts` event classes MUST exist

### Requirement: Pagamento Application Layer — Use Cases
The application layer MUST contain use case services.

#### Scenario: CriarPixChargeUseCase Exists
- GIVEN the `src/application/pagamento/services/` directory
- WHEN the codebase is inspected
- THEN a `CriarPixChargeUseCase.ts` class MUST exist
- AND it MUST create payment aggregate and call external Pix API

#### Scenario: ProcessarWebhookUseCase Exists
- GIVEN the `src/application/pagamento/services/` directory
- WHEN the codebase is inspected
- THEN a `ProcessarWebhookUseCase.ts` class MUST exist
- AND it MUST validate webhook signature, idempotency check, and update payment status
- AND it MUST emit domain events on status changes

#### Scenario: IniciarReembolsoUseCase Exists
- GIVEN the `src/application/pagamento/services/` directory
- WHEN the codebase is inspected
- THEN an `IniciarReembolsoUseCase.ts` class MUST exist
- AND it MUST call provider refund API and update payment status

### Requirement: Pagamento Infrastructure Layer — Persistence
The infrastructure layer MUST implement repository interfaces.

#### Scenario: PagamentoRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/pagamento/` directory
- WHEN the codebase is inspected
- THEN a `PagamentoRepository.ts` class MUST exist implementing `IPagamentoRepository`
- AND it MUST use Dexie for IndexedDB persistence

#### Scenario: TransacaoRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/pagamento/` directory
- WHEN the codebase is inspected
- THEN a `TransacaoRepository.ts` class MUST exist implementing `ITransacaoRepository`

### Requirement: Pagamento Infrastructure Layer — External Adapters
The infrastructure layer MUST contain external API adapters.

#### Scenario: PixAdapter Exists
- GIVEN the `src/infrastructure/external/` directory
- WHEN the codebase is inspected
- THEN a `PixAdapter.ts` class MUST exist
- AND it MUST implement Pix charge creation and status polling
- AND it MUST expose a clean interface for use cases

#### Scenario: StripeAdapter Exists
- GIVEN the `src/infrastructure/external/` directory
- WHEN the codebase is inspected
- THEN a `StripeAdapter.ts` class MUST exist
- AND it MUST implement Stripe PaymentIntent creation
- AND it MUST handle card payment processing

### Requirement: Pagamento Presentation Layer — Boundaries
The presentation layer MUST only contain UI rendering and input collection.

#### Scenario: Payment Components Delegate to Application Layer
- GIVEN any component in `src/presentation/` related to payment
- WHEN the component is inspected
- THEN it MUST NOT contain payment processing logic
- AND all payment operations MUST delegate to application use cases

#### Scenario: Webhook Handler Routes to Use Case
- GIVEN `src/presentation/pages/api/webhooks/pagamento.ts`
- WHEN the webhook is received
- THEN it MUST delegate to `ProcessarWebhookUseCase`
- AND the handler MUST NOT contain business logic

### Requirement: Pagamento Dependency Rules
The system MUST enforce unidirectional dependency flow between layers.

#### Scenario: Domain Has No External Dependencies
- GIVEN any file in `src/domain/pagamento/`
- WHEN imports are inspected
- THEN NO import from `src/application/`, `src/infrastructure/`, or `src/presentation/` MUST exist

#### Scenario: External Adapters Are Infrastructure
- GIVEN any adapter in `src/infrastructure/external/`
- WHEN the adapter is inspected
- THEN it MUST implement interfaces defined in `src/domain/pagamento/`
- AND it MUST NOT be referenced directly from domain or application layers

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
