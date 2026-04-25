# Spec for Menu Domain

## ADDED Requirements

### Requirement: Menu Data Structure
The system SHALL provide a hierarchical menu structure consisting of categories, products within categories, modifier groups attached to products, and modifier values within modifier groups.

#### Scenario: Browse Categories
- GIVEN the customer has opened the restaurant menu application
- WHEN the customer navigates to the menu section
- THEN the system SHALL display all active categories in ascending display_order sequence
- AND each category SHALL display its name and description

#### Scenario: View Products in Category
- GIVEN the customer has selected a category from the menu
- WHEN the system loads the category view
- THEN the system SHALL display all active products belonging to that category
- AND each product SHALL display its name, price, and thumbnail image
- AND products with dietary labels SHALL display those labels

#### Scenario: View Product Detail
- GIVEN the customer has selected a product from a category
- WHEN the system loads the product detail view
- THEN the system SHALL display the full product name, description, and price
- AND the system SHALL display the product image at full resolution
- AND the system SHALL display all dietary labels (vegan, gluten-free, etc.)
- AND the system SHALL display all modifier groups associated with the product
- AND each modifier group SHALL indicate whether it is required or optional

#### Scenario: Filter Products by Dietary Label
- GIVEN the customer is viewing a category
- WHEN the customer applies a dietary filter (e.g., "vegan", "gluten-free")
- THEN the system SHALL display only products containing the selected dietary label
- AND products not matching the filter SHALL be hidden

#### Scenario: Search Products by Name
- GIVEN the customer has initiated a search
- WHEN the customer enters a search query
- THEN the system SHALL display products whose names contain the search query (case-insensitive)
- AND the search SHALL span all categories

### Requirement: Offline Menu Access
The system SHALL cache menu data locally to enable browsing when connectivity is unavailable.

#### Scenario: Access Menu While Offline
- GIVEN the customer has previously loaded the menu while online
- WHEN the customer opens the application while offline
- THEN the system SHALL load the cached menu from IndexedDB
- AND all category and product data SHALL be displayed from cache

#### Scenario: Menu Data Sync on Reconnect
- GIVEN the customer is online and has stale cached menu data
- WHEN the application detects network connectivity
- THEN the system SHALL fetch updated menu data from Supabase
- AND the system SHALL update the IndexedDB cache with new data
- AND the UI SHALL reflect the updated menu without requiring a manual refresh

### Requirement: Menu Data Consistency
The system SHALL enforce referential integrity between categories and products.

#### Scenario: Product Without Category
- GIVEN a product exists in the database
- WHEN the product's category is set to inactive or deleted
- THEN the system SHALL exclude that product from customer-facing menu views
- AND the system SHALL preserve the product data for administrative purposes

### Requirement: Menu Page Color Consistency
The menu page MUST use the official color palette defined in the design system.

#### Scenario: Category Navigation Colors
- GIVEN the customer navigates to the menu page
- WHEN the category tabs or navigation is rendered
- THEN active category MUST use `--color-primary` for indication
- AND inactive categories MUST use `--color-text-secondary`
- AND category borders MUST use `--color-border`

#### Scenario: Product Card Colors
- GIVEN the customer views product cards in a category
- WHEN product cards are rendered
- THEN card backgrounds MUST use `--color-surface`
- AND card borders MUST use `--color-border`
- AND product names MUST use `--color-text-primary`
- AND prices MUST use `--color-primary`
- AND descriptions MUST use `--color-text-secondary`

#### Scenario: Product Detail Modal Colors
- GIVEN the customer opens a product detail view
- WHEN the modal or detail section is rendered
- THEN the background MUST use `--color-surface`
- AND section dividers MUST use `--color-border`
- AND the "Add to Cart" button MUST use `--color-primary` or `--gradient-primary`

#### Scenario: Dietary Label Colors
- GIVEN a product has dietary labels (vegan, gluten-free, etc.)
- WHEN labels are displayed
- THEN the labels SHOULD use semantic colors:
  - Vegan: `--color-success`
  - Gluten-free: `--color-warning`
  - Spicy: `--color-accent`

#### Scenario: Menu Dark Mode
- GIVEN the customer has enabled dark mode
- WHEN the menu page is rendered
- THEN all backgrounds MUST use dark theme `--color-surface` variants
- AND text MUST use dark theme `--color-text-primary` and `--color-text-secondary`
- AND borders MUST use dark theme `--color-border`
- AND active category indicators MUST remain visible

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.

---

## DDD Architecture Requirements (from implantacao-ddd)

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