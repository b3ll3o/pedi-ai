# Delta for Admin Bounded Context

## Overview

This delta spec defines DDD layer requirements for the `admin` bounded context, covering administrative operations for restaurant management. All requirements enforce clean separation between domain logic, application use cases, infrastructure implementations, and presentation.

## ADDED Requirements

### Requirement: Admin Domain Layer — Entities
The domain layer MUST contain administrative entities.

#### Scenario: Restaurante Entity Exists
- GIVEN the `src/domain/admin/entities/` directory
- WHEN the codebase is inspected
- THEN a `Restaurante.ts` entity MUST exist with properties: `id`, `nome`, `cnpj`, `endereco`, `configuracoes`, `criadoEm`
- AND the entity MUST NOT import from Next.js, React, or infrastructure layers

### Requirement: Admin Domain Layer — Value Objects
The domain layer MUST contain value objects.

#### Scenario: ConfiguracoesRestaurante Value Object Exists
- GIVEN the `src/domain/admin/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `ConfiguracoesRestaurante.ts` value object MUST exist with settings properties

#### Scenario: Estatisticas Value Object Exists
- GIVEN the `src/domain/admin/value-objects/` directory
- WHEN the codebase is inspected
- THEN an `Estatisticas.ts` value object MUST exist for analytics data

### Requirement: Admin Domain Layer — Aggregates
The domain layer MUST contain aggregate roots.

#### Scenario: AdminAggregate Exists
- GIVEN the `src/domain/admin/aggregates/` directory
- WHEN the codebase is inspected
- THEN an `AdminAggregate.ts` aggregate root MUST exist
- AND it MUST encapsulate restaurant administration logic
- AND it MUST coordinate across other bounded contexts for admin operations

### Requirement: Admin Domain Layer — Repository Interfaces
The domain layer MUST define repository interfaces.

#### Scenario: IRestauranteRepository Interface Exists
- GIVEN the `src/domain/admin/repositories/` directory
- WHEN the codebase is inspected
- THEN an `IRestauranteRepository.ts` interface MUST exist with methods: `findById(id)`, `save(restaurante)`, `update(restaurante)`

#### Scenario: IEstatisticasRepository Interface Exists
- GIVEN the `src/domain/admin/repositories/` directory
- WHEN the codebase is inspected
- THEN an `IEstatisticasRepository.ts` interface MUST exist with methods: `obterPedidosPorPeriodo(inicio, fim)`, `obterItensPopulares(inicio, fim)`, `obterReceitaTotal(inicio, fim)`

### Requirement: Admin Domain Layer — Domain Events
The domain layer MUST define domain events.

#### Scenario: Domain Events Exist
- GIVEN the `src/domain/admin/events/` directory
- WHEN the codebase is inspected
- THEN `RestauranteAtualizadoEvent.ts` event class MUST exist

### Requirement: Admin Application Layer — Use Cases
The application layer MUST contain use case services.

#### Scenario: GerenciarCategoriaUseCase Exists
- GIVEN the `src/application/admin/services/` directory
- WHEN the codebase is inspected
- THEN a `GerenciarCategoriaUseCase.ts` class MUST exist
- AND it MUST delegate category CRUD to cardapio bounded context

#### Scenario: GerenciarProdutoUseCase Exists
- GIVEN the `src/application/admin/services/` directory
- WHEN the codebase is inspected
- THEN a `GerenciarProdutoUseCase.ts` class MUST exist
- AND it MUST delegate product CRUD to cardapio bounded context

#### Scenario: GerenciarMesaUseCase Exists
- GIVEN the `src/application/admin/services/` directory
- WHEN the codebase is inspected
- THEN a `GerenciarMesaUseCase.ts` class MUST exist
- AND it MUST delegate mesa operations to mesa bounded context

#### Scenario: ObterEstatisticasUseCase Exists
- GIVEN the `src/application/admin/services/` directory
- WHEN the codebase is inspected
- THEN an `ObterEstatisticasUseCase.ts` class MUST exist
- AND it MUST aggregate statistics from pedido and pagamento bounded contexts

#### Scenario: GerenciarPedidosAdminUseCase Exists
- GIVEN the `src/application/admin/services/` directory
- WHEN the codebase is inspected
- THEN a `GerenciarPedidosAdminUseCase.ts` class MUST exist
- AND it MUST delegate order management to pedido bounded context

### Requirement: Admin Infrastructure Layer — Persistence
The infrastructure layer MUST implement repository interfaces.

#### Scenario: RestauranteRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/admin/` directory
- WHEN the codebase is inspected
- THEN a `RestauranteRepository.ts` class MUST exist implementing `IRestauranteRepository`
- AND it MUST use Dexie for local caching

#### Scenario: EstatisticasRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/admin/` directory
- WHEN the codebase is inspected
- THEN an `EstatisticasRepository.ts` class MUST exist implementing `IEstatisticasRepository`
- AND it MUST aggregate data from other repository implementations

### Requirement: Admin Presentation Layer — Boundaries
The presentation layer MUST only contain UI rendering and input collection.

#### Scenario: Admin Pages Delegate to Application Layer
- GIVEN `src/presentation/pages/admin/` contains admin pages
- WHEN the pages are inspected
- THEN they MUST NOT contain business logic
- AND all CRUD operations MUST delegate to application use cases

#### Scenario: Admin Components Are Thin
- GIVEN any component in `src/presentation/components/admin/`
- WHEN the component is inspected
- THEN it MUST only handle UI state and user input
- AND data operations MUST delegate to application layer

#### Scenario: Dashboard Uses Statistics Use Cases
- GIVEN the admin dashboard displays analytics
- WHEN the data is fetched
- THEN the dashboard MUST call `ObterEstatisticasUseCase`
- AND the dashboard MUST NOT directly query repositories

### Requirement: Admin Dependency Rules
The system MUST enforce unidirectional dependency flow between layers.

#### Scenario: Admin Uses Other Bounded Contexts
- GIVEN admin bounded context needs to manage entities from other contexts
- WHEN the admin context is inspected
- THEN it MUST use application layer use cases from other bounded contexts
- AND it MUST NOT directly access other bounded contexts repositories

#### Scenario: Admin Domain Is Coordinator
- GIVEN the `src/domain/admin/` directory
- WHEN the domain is inspected
- THEN it MUST act as a thin coordinator with minimal logic
- AND most admin logic MUST live in `src/application/admin/services/`

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
