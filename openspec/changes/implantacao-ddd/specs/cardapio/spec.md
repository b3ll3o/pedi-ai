# Delta for Cardápio Bounded Context

## Overview

This delta spec defines DDD layer requirements for the `cardapio` bounded context, covering menu, combos, and modifier-groups domains. All requirements enforce clean separation between domain logic, application use cases, infrastructure implementations, and presentation.

## ADDED Requirements

### Requirement: Cardápio Domain Layer — Entities
The domain layer MUST contain entities representing menu structure.

#### Scenario: Categoria Entity Exists
- GIVEN the `src/domain/cardapio/entities/` directory
- WHEN the codebase is inspected
- THEN a `Categoria.ts` entity MUST exist with properties: `id`, `nome`, `descricao`, `ordemExibicao`, `ativo`
- AND the entity MUST NOT import from Next.js, React, or infrastructure layers

#### Scenario: ItemCardapio Entity Exists
- GIVEN the `src/domain/cardapio/entities/` directory
- WHEN the codebase is inspected
- THEN an `ItemCardapio.ts` entity MUST exist with properties: `id`, `categoriaId`, `nome`, `descricao`, `preco`, `imagemUrl`, `tipo` (produto/combo), `labelsDieteticos`, `ativo`
- AND the entity MUST support both regular products and combo products

#### Scenario: Combo Entity Exists
- GIVEN the `src/domain/cardapio/entities/` directory
- WHEN the codebase is inspected
- THEN a `Combo.ts` entity MUST exist with properties: `id`, `nome`, `descricao`, `precoBundle`, `itens`, `categoriaId`, `ativo`
- AND the combo MUST contain references to bundled ItemCardapio products

### Requirement: Cardápio Domain Layer — Value Objects
The domain layer MUST contain value objects for immutable concepts.

#### Scenario: TipoItemCardapio Value Object Exists
- GIVEN the `src/domain/cardapio/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `TipoItemCardapio.ts` value object MUST exist with values: `produto`, `combo`

#### Scenario: LabelDietetico Value Object Exists
- GIVEN the `src/domain/cardapio/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `LabelDietetico.ts` value object MUST exist with values: `vegetariano`, `vegano`, `glutenFree`, `sugarFree`, etc.

### Requirement: Cardápio Domain Layer — Aggregates
The domain layer MUST contain aggregates for modifier groups.

#### Scenario: ModificadorGrupoAggregate Exists
- GIVEN the `src/domain/cardapio/aggregates/` directory
- WHEN the codebase is inspected
- THEN a `ModificadorGrupoAggregate.ts` aggregate root MUST exist
- AND it MUST contain `ModificadorGrupo` and `ModificadorValor` entities
- AND it MUST enforce: required groups must have at least one valor selected before add-to-cart

#### Scenario: ComboAggregate Exists
- GIVEN the `src/domain/cardapio/aggregates/` directory
- WHEN the codebase is inspected
- THEN a `ComboAggregate.ts` aggregate root MUST exist
- AND it MUST calculate bundle price versus sum of individual items
- AND it MUST enforce combo item consistency

### Requirement: Cardápio Domain Layer — Repository Interfaces
The domain layer MUST define repository interfaces as contracts.

#### Scenario: ICategoriaRepository Interface Exists
- GIVEN the `src/domain/cardapio/repositories/` directory
- WHEN the codebase is inspected
- THEN an `ICategoriaRepository.ts` interface MUST exist with methods: `findAll()`, `findById(id)`, `findAtivas()`, `save(categoria)`, `delete(id)`

#### Scenario: IItemCardapioRepository Interface Exists
- GIVEN the `src/domain/cardapio/repositories/` directory
- WHEN the codebase is inspected
- THEN an `IItemCardapioRepository.ts` interface MUST exist with methods: `findByCategoriaId(categoriaId)`, `findById(id)`, `findCombos()`, `findAtivos()`, `save(item)`, `delete(id)`

#### Scenario: IModificadorGrupoRepository Interface Exists
- GIVEN the `src/domain/cardapio/repositories/` directory
- WHEN the codebase is inspected
- THEN an `IModificadorGrupoRepository.ts` interface MUST exist with methods: `findByItemId(itemId)`, `findById(id)`, `save(grupo)`, `delete(id)`

### Requirement: Cardápio Domain Layer — Domain Events
The domain layer MUST define domain events.

#### Scenario: Domain Events Exist
- GIVEN the `src/domain/cardapio/events/` directory
- WHEN the codebase is inspected
- THEN `CardapioAtualizadoEvent.ts` event class MUST exist
- AND the event MUST be emitted when menu data changes

### Requirement: Cardápio Application Layer — Use Cases
The application layer MUST contain use case services.

#### Scenario: ListarCardapioUseCase Exists
- GIVEN the `src/application/cardapio/services/` directory
- WHEN the codebase is inspected
- THEN a `ListarCardapioUseCase.ts` class MUST exist
- AND it MUST return categorized menu data by delegating to domain repositories

#### Scenario: ObterDetalheProdutoUseCase Exists
- GIVEN the `src/application/cardapio/services/` directory
- WHEN the codebase is inspected
- THEN an `ObterDetalheProdutoUseCase.ts` class MUST exist
- AND it MUST return product details including modifier groups

#### Scenario: CriarComboUseCase Exists
- GIVEN the `src/application/cardapio/services/` directory
- WHEN the codebase is inspected
- THEN a `CriarComboUseCase.ts` class MUST exist
- AND it MUST create combo aggregates and persist via repository

### Requirement: Cardápio Infrastructure Layer — Persistence
The infrastructure layer MUST implement repository interfaces using Dexie/IndexedDB.

#### Scenario: CategoriaRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/cardapio/` directory
- WHEN the codebase is inspected
- THEN a `CategoriaRepository.ts` class MUST exist implementing `ICategoriaRepository`
- AND it MUST use Dexie for IndexedDB persistence

#### Scenario: ItemCardapioRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/cardapio/` directory
- WHEN the codebase is inspected
- THEN an `ItemCardapioRepository.ts` class MUST exist implementing `IItemCardapioRepository`
- AND it MUST handle product and combo data persistence

#### Scenario: Sync Service Exists
- GIVEN the `src/infrastructure/persistence/cardapio/` directory
- WHEN the codebase is inspected
- THEN a `CardapioSyncService.ts` class MUST exist
- AND it MUST sync menu data from Supabase to IndexedDB cache

### Requirement: Cardápio Presentation Layer — Boundaries
The presentation layer MUST only contain UI rendering and input collection.

#### Scenario: Presentation Layer Has No Domain Logic
- GIVEN any component in `src/presentation/components/` related to menu
- WHEN the component is inspected
- THEN it MUST NOT contain business logic, validation, or data manipulation
- AND all data operations MUST delegate to application use cases

#### Scenario: Menu Hooks Delegate to Application Layer
- GIVEN `src/presentation/hooks/` contains menu-related hooks
- WHEN the hooks are inspected
- THEN each hook MUST call use cases from `src/application/cardapio/services/`

### Requirement: Cardápio Dependency Rules
The system MUST enforce unidirectional dependency flow between layers.

#### Scenario: Domain Has No External Dependencies
- GIVEN any file in `src/domain/cardapio/`
- WHEN imports are inspected
- THEN NO import from `src/application/`, `src/infrastructure/`, or `src/presentation/` MUST exist

#### Scenario: Application Uses Constructor Injection
- GIVEN any use case in `src/application/cardapio/services/`
- WHEN the use case is inspected
- THEN repository dependencies MUST be injected via constructor
- AND the use case MUST NOT instantiate repositories directly

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
