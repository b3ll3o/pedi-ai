# Spec for Admin Domain

## ADDED Requirements

### Requirement: Admin Authentication
The system SHALL enforce authentication for all admin panel access.

#### Scenario: Admin Login
- GIVEN a user navigates to the admin login page
- WHEN the user submits valid credentials
- THEN the system SHALL authenticate the user via Supabase Auth
- AND the system SHALL create a session
- AND the user SHALL be redirected to the admin dashboard

#### Scenario: Admin Logout
- GIVEN an admin user is logged in
- WHEN the admin clicks logout
- THEN the system SHALL clear the session
- AND the user SHALL be redirected to the login page

#### Scenario: Protected Route Access
- GIVEN an unauthenticated user attempts to access an admin route
- WHEN the user navigates to an admin URL
- THEN the system SHALL redirect the user to the login page
- AND the original URL SHALL be preserved for post-login redirect

### Requirement: Role-Based Access Control
The system SHALL enforce role-based permissions for admin operations.

#### Scenario: Owner Access to All Features
- GIVEN a user with the "owner" role is logged in
- WHEN the user accesses any admin feature
- THEN the system SHALL grant full access to all CRUD operations
- AND the system SHALL allow access to analytics and settings

#### Scenario: Manager Access
- GIVEN a user with the "manager" role is logged in
- WHEN the user accesses admin features
- THEN the system SHALL grant access to categories, products, modifiers, combos, tables, and orders
- AND the system SHALL deny access to user management and restaurant settings

#### Scenario: Staff Access
- GIVEN a user with the "staff" role is logged in
- WHEN the user accesses admin features
- THEN the system SHALL grant access to orders only
- AND the system SHALL deny access to menu management, tables, and settings

#### Scenario: Role Hierarchy Enforcement
- GIVEN a user with a specific role attempts to manage another user
- WHEN the system evaluates permission to modify the target user's role
- THEN the system SHALL enforce the following hierarchy: owner > manager > staff
- AND a user SHALL only be able to manage roles strictly lower than their own
- AND `canManageRole(currentRole, targetRole)` SHALL return true only when currentRole is higher in hierarchy

#### Scenario: Role Label Display
- GIVEN a user role is retrieved for display
- WHEN the role needs to be shown to an admin user
- THEN the system SHALL return localized labels:
  - `owner` → "Proprietário"
  - `manager` → "Gerente"
  - `staff` → "Funcionário"
- AND the function `getRoleLabel(role)` SHALL be used for all role display

#### Scenario: Role Color Coding
- GIVEN a user role is displayed in the admin interface
- WHEN the role badge is rendered
- THEN the system SHALL use semantic colors:
  - `owner` → `#dc2626` (red)
  - `manager` → `#d97706` (amber)
  - `staff` → `#2563eb` (blue)
- AND the function `getRoleColor(role)` SHALL be used for all role color styling

#### Scenario: API Staff Restrictions
- GIVEN a user with the "staff" role makes an API request
- WHEN the staff user attempts to access restricted admin endpoints
- THEN the system SHALL deny access to:
  - QR code generation endpoints (403 Forbidden)
  - User management endpoints (create, update, delete users)
  - Restaurant settings endpoints
  - Analytics endpoints
- AND the `requireRole()` function SHALL throw a 403 error for unauthorized role access
- AND the error message SHALL be "Acesso negado"

#### Scenario: API Role Hierarchy in Endpoints
- GIVEN an API endpoint has role restrictions
- WHEN a request is made with insufficient role level
- THEN the system SHALL deny access based on the role hierarchy
- AND only users with roles higher in the hierarchy SHALL be granted access
- AND staff users SHALL be blocked from all user management operations

### Requirement: Restaurant CRUD
The system SHALL provide full CRUD operations for restaurants.

#### Scenario: List Restaurants
- GIVEN a user with owner role is logged in
- WHEN the user navigates to the restaurants management section
- THEN the system SHALL display all restaurants the user owns or manages via user_restaurants junction

#### Scenario: Create Restaurant
- GIVEN a user is in the restaurants management section
- WHEN the user creates a new restaurant with name, description, address, and phone
- THEN the system SHALL create the restaurant record
- AND the system SHALL create a user_restaurants junction entry linking the user as owner

#### Scenario: Edit Restaurant
- GIVEN a user is editing an existing restaurant
- WHEN the user modifies restaurant fields and saves
- THEN the system SHALL update the restaurant record
- AND changes SHALL be reflected immediately

#### Scenario: Delete Restaurant
- GIVEN a user is deleting an existing restaurant
- WHEN the user confirms the deletion
- THEN the system SHALL soft-delete the restaurant (mark as inactive)
- AND all related data SHALL be preserved for historical integrity

#### Scenario: Manage Restaurant Team
- GIVEN a user with owner/manager role is viewing restaurant settings
- WHEN the user navigates to team management
- THEN the system SHALL display all users linked via user_restaurants
- AND the user SHALL be able to invite/remove team members

#### Scenario: Switch Active Restaurant
- GIVEN a user has access to multiple restaurants
- WHEN the user selects a different restaurant in the admin panel
- THEN the system SHALL filter all subsequent operations by the selected restaurant
- AND the restaurant selector SHALL show the currently active restaurant

### Requirement: Category CRUD
The system SHALL provide full CRUD operations for menu categories.

#### Scenario: Create Category
- GIVEN an admin is in the categories management section
- WHEN the admin creates a new category with name, description, and display order
- THEN the system SHALL create the category record
- AND the category SHALL be available in the customer menu if marked active

#### Scenario: Update Category
- GIVEN an admin is editing an existing category
- WHEN the admin modifies category fields and saves
- THEN the system SHALL update the category record
- AND changes SHALL be reflected immediately in the customer menu

#### Scenario: Delete Category
- GIVEN an admin is editing an existing category
- WHEN the admin deletes the category
- THEN the system SHALL soft-delete the category (mark as inactive)
- AND products in the category SHALL be hidden from customer menu
- AND the category record SHALL be preserved for historical orders

#### Scenario: Reorder Categories
- GIVEN an admin is in the categories management section
- WHEN the admin changes the display order of categories
- THEN the system SHALL update the display_order values
- AND the customer menu SHALL reflect the new ordering

### Requirement: Product CRUD
The system SHALL provide full CRUD operations for menu products.

#### Scenario: Create Product
- GIVEN an admin is in the products management section
- WHEN the admin creates a product with name, description, price, category, and image
- THEN the system SHALL create the product record
- AND the product SHALL be associated with the selected category
- AND dietary labels SHALL be stored as an array

#### Scenario: Update Product
- GIVEN an admin is editing an existing product
- WHEN the admin modifies product fields and saves
- THEN the system SHALL update the product record
- AND changes SHALL be reflected in the customer menu immediately

#### Scenario: Delete Product
- GIVEN an admin is deleting an existing product
- WHEN the admin confirms the deletion
- THEN the system SHALL soft-delete the product (mark as inactive)
- AND the product SHALL be hidden from customer menu
- AND existing orders containing the product SHALL be preserved

### Requirement: Modifier Group CRUD
The system SHALL provide full CRUD operations for product modifier groups.

#### Scenario: Create Modifier Group
- GIVEN an admin is editing a product
- WHEN the admin creates a modifier group with name, required flag, and min/max selections
- THEN the system SHALL create the modifier group record
- AND the system SHALL allow adding modifier values to the group

#### Scenario: Modifier Group Required Validation
- GIVEN a modifier group is marked as required
- WHEN a customer adds the product to cart without selecting modifiers
- THEN the system SHALL prevent adding to cart until required modifiers are selected

### Requirement: Modifier Value CRUD
The system SHALL provide full CRUD operations for modifier values.

#### Scenario: Add Modifier Value
- GIVEN an admin is editing a modifier group
- WHEN the admin adds a modifier value with name and price adjustment
- THEN the system SHALL create the modifier value record
- AND the modifier SHALL appear in the customer product view

#### Scenario: Update Modifier Value Price
- GIVEN an admin is editing a modifier value
- WHEN the admin changes the price adjustment
- THEN the system SHALL update the modifier value record
- AND the new price adjustment SHALL apply to new orders

### Requirement: Combo CRUD
The system SHALL provide full CRUD operations for combo meals.

#### Scenario: Create Combo
- GIVEN an admin is in the combos management section
- WHEN the admin creates a combo with name, bundle price, and linked products
- THEN the system SHALL create the combo record
- AND the combo SHALL be associated with the linked products via combo_items

#### Scenario: Combo Bundle Pricing
- GIVEN a combo has a bundle price set
- WHEN a customer adds the combo to cart
- THEN the cart SHALL use the bundle price instead of individual product prices

### Requirement: Order Management
The system SHALL provide order viewing and status management.

#### Scenario: List Orders with Filters
- GIVEN an admin is in the orders management section
- WHEN the admin views the order list
- THEN the system SHALL display all orders with status, date, table, and total
- AND the admin SHALL be able to filter by status and date range

#### Scenario: View Order Details
- GIVEN an admin is viewing the order list
- WHEN the admin clicks on an order
- THEN the system SHALL display full order details including all items, modifiers, and status history

### Requirement: Analytics Dashboard
The system SHALL provide basic analytics for restaurant operations.

#### Scenario: View Orders Per Period
- GIVEN an admin is on the dashboard
- WHEN the admin views the analytics section
- THEN the system SHALL display orders count grouped by day/week/month
- AND the system SHALL display total revenue for the period

#### Scenario: View Popular Items
- GIVEN an admin is on the dashboard
- WHEN the admin views the popular items chart
- THEN the system SHALL display the top 10 products by order frequency
- AND the data SHALL cover the selected time period

### Requirement: N:N Usuario-Restaurante Relationship
The system MUST support a many-to-many relationship between users and restaurants, replacing the previous one-to-one relationship.

#### Scenario: Migrate Existing 1:1 to N:N
- GIVEN an existing user has a `restauranteId` set
- WHEN the migration script runs
- THEN the system SHALL create a record in `usuario_restaurantes` with `papel='owner'`
- AND the user's `restauranteId` column SHALL be removed
- AND all existing menu items SHALL be updated with the restaurant's ID

#### Scenario: Owner Creates New Restaurant
- GIVEN an authenticated owner navigates to the restaurant creation page
- WHEN the owner submits valid restaurant data (nome, CNPJ, endereço, telefone)
- THEN the system SHALL create a new `Restaurante` record with `ativo=true`
- AND the system SHALL create a `UsuarioRestaurante` junction record with `papel='owner'`
- AND the system SHALL emit `RestauranteCriadoEvent`

#### Scenario: Owner Lists Their Restaurants
- GIVEN an authenticated owner is logged in
- WHEN the owner navigates to the restaurant list page
- THEN the system SHALL return all restaurants where the user has a `UsuarioRestaurante` record
- AND each restaurant SHALL include the user's role (owner, manager, staff) in that restaurant

#### Scenario: User Has No Restaurant Access
- GIVEN an authenticated user has no `UsuarioRestaurante` records
- WHEN the user attempts to access any restaurant-scoped admin page
- THEN the system SHALL return 403 Forbidden
- AND the system SHALL display an error message "Você não tem acesso a este restaurante"

### Requirement: User-Restaurant Linking
The system SHALL allow owners and managers to link and unlink users to restaurants.

#### Scenario: Link User to Restaurant
- GIVEN an owner or manager is on the team management page
- WHEN the admin searches for a user by email and selects a role
- THEN the system SHALL create a `UsuarioRestaurante` record
- AND the system SHALL emit `UsuarioVinculadoRestauranteEvent`
- AND the user SHALL immediately see the restaurant in their selector

#### Scenario: Unlink User from Restaurant
- GIVEN an owner or manager is on the team management page
- WHEN the admin removes a user from the team
- THEN the system SHALL delete the `UsuarioRestaurante` record
- AND the system SHALL emit `UsuarioDesvinculadoRestauranteEvent`
- AND the user SHALL lose access to that restaurant immediately

#### Scenario: Prevent Owner Self-Removal
- GIVEN an owner is on the team management page
- WHEN the owner attempts to remove their own owner linkage
- THEN the system SHALL prevent the action
- AND the system SHALL display an error "Não é possível remover o proprietário do restaurante"
- AND the `UsuarioRestaurante` record SHALL remain unchanged

### Requirement: Restaurant Selector in Admin UI
The admin UI MUST provide a mechanism to switch between restaurants.

#### Scenario: Display Restaurant Selector
- GIVEN an admin user has access to multiple restaurants
- WHEN the admin UI renders
- THEN a restaurant selector SHALL be visible in the sidebar or header
- AND the selector SHALL show the current restaurant name
- AND the selector SHALL allow switching between accessible restaurants

#### Scenario: Switch Restaurant Context
- GIVEN an admin is viewing the admin panel for Restaurant A
- WHEN the admin selects Restaurant B from the selector
- THEN the system SHALL update the current context to Restaurant B
- AND all subsequent admin actions SHALL be scoped to Restaurant B
- AND the URL MAY reflect the restaurant ID
- AND the UI SHALL display Restaurant B's data

#### Scenario: Filter Menu Management by Restaurant
- GIVEN an admin is on the products, categories, or modifiers page
- WHEN the page loads
- THEN the system SHALL automatically filter results to the currently selected restaurant
- AND no data from other restaurants SHALL be displayed

#### Scenario: User Without Restaurant Access
- GIVEN a user is authenticated but has no `UsuarioRestaurante` records
- WHEN the user attempts to access any admin page
- THEN the system SHALL redirect to a "Nenhum restaurante" page
- AND the system SHALL prompt the user to contact an administrator

### Requirement: Offline Sync Scoped by Restaurant
The system SHALL maintain separate offline caches for each restaurant's menu.

#### Scenario: Cache Menu Per Restaurant
- GIVEN a user has selected Restaurant A
- WHEN the menu data is fetched
- THEN the system SHALL cache the data in IndexedDB with key prefix `restaurant_${restauranteId}_`
- AND Restaurant B's menu data SHALL be stored separately

#### Scenario: Offline Access Shows Correct Restaurant Menu
- GIVEN a user is offline and previously accessed Restaurant A's menu
- WHEN the user opens the application offline
- THEN the system SHALL load Restaurant A's cached menu
- AND the user SHALL NOT see Restaurant B's menu data

#### Scenario: Sync Queue Per Restaurant
- GIVEN a user makes offline changes for Restaurant A
- WHEN the device comes online
- THEN the system SHALL sync Restaurant A's changes separately from Restaurant B's
- AND each restaurant's offline queue SHALL be processed independently

#### Scenario: Offline Orders Linked to Correct Restaurant
- GIVEN a user is offline and places an order
- WHEN the order is created
- THEN the order SHALL include the current `restauranteId`
- AND when online, the order SHALL sync to the correct restaurant

### Requirement: Admin Dashboard Color Consistency
The admin dashboard MUST use the official color palette defined in the design system.

#### Scenario: Admin Sidebar Colors
- GIVEN an admin user is logged in
- WHEN the sidebar navigation is rendered
- THEN sidebar background MUST use `--color-surface`
- AND active nav item MUST use `--color-primary` background with contrast text
- AND inactive nav items MUST use `--color-text-secondary`
- AND sidebar borders MUST use `--color-border`

#### Scenario: Admin Data Table Colors
- GIVEN an admin views a data table (orders, products, categories)
- WHEN the table is rendered
- THEN table headers MUST use `--color-surface-elevated`
- AND table borders MUST use `--color-border`
- AND alternating rows MAY use `--color-surface` and `--color-surface-elevated`
- AND text MUST use `--color-text-primary` and `--color-text-secondary`
- AND action buttons MUST use semantic colors (edit: `--color-info`, delete: `--color-error`)

#### Scenario: Admin Form Colors
- GIVEN an admin is filling out a form
- WHEN form fields are rendered
- THEN input backgrounds MUST use `--color-surface`
- AND input borders MUST use `--color-border`
- AND focus state MUST show `--color-focus-ring`
- AND labels MUST use `--color-text-primary`
- AND helper text MUST use `--color-text-secondary`
- AND error states MUST use `--color-error`

#### Scenario: Admin Stat Cards Colors
- GIVEN an admin views dashboard stat cards
- WHEN stat cards are rendered
- THEN card backgrounds MUST use `--color-surface`
- AND card borders MUST use `--color-border`
- AND primary stats MAY use `--color-primary`
- AND secondary stats MUST use `--color-text-secondary`

#### Scenario: Admin Status Badge Colors
- GIVEN an admin views order or product status badges
- WHEN badges are rendered
- THEN status colors MUST use semantic tokens:
  - Pending: `--color-warning`
  - Active/Complete: `--color-success`
  - Cancelled/Error: `--color-error`
  - In Progress: `--color-info`

#### Scenario: Admin Dark Mode
- GIVEN an admin has enabled dark mode
- WHEN the admin dashboard is rendered
- THEN sidebar MUST use dark theme `--color-surface`
- AND tables MUST use dark theme backgrounds
- AND forms MUST use dark theme inputs
- AND text MUST use dark theme `--color-text-primary` and `--color-text-secondary`
- AND status badges MUST remain visible with proper contrast

#### Scenario: Admin Primary Action Buttons
- GIVEN an admin clicks a primary action button (Save, Create, Update)
- WHEN the button is rendered
- THEN the button background MUST use `--color-primary` or `--gradient-primary`
- AND button text MUST be white or have sufficient contrast
- AND hover state MUST be visually distinct

#### Scenario: Admin Destructive Action Buttons
- GIVEN an admin clicks a destructive action button (Delete)
- WHEN the button is rendered
- THEN the button background SHOULD use `--color-error`
- AND the button text MUST be white with sufficient contrast
- AND a confirmation dialog SHOULD appear before action execution

---

## MODIFIED Requirements

### Requirement: Category CRUD (Modified — Restaurant Scoped)
The system SHALL provide full CRUD operations for menu categories scoped to a restaurant.

#### Scenario: Create Category (Modified)
- GIVEN an admin is in the categories management section for a specific restaurant
- WHEN the admin creates a new category with name, description, and display order
- THEN the system SHALL create the category record with `restauranteId` set
- AND the category SHALL be available in the customer menu of that restaurant only

#### Scenario: Delete Category (Modified)
- GIVEN an admin is editing an existing category
- WHEN the admin deletes the category
- THEN the system SHALL soft-delete the category scoped to its restaurant
- AND products in the category SHALL be hidden from that restaurant's customer menu
- AND the category record SHALL be preserved for historical orders

### Requirement: Product CRUD (Modified — Restaurant Scoped)
The system SHALL provide full CRUD operations for menu products scoped to a restaurant.

#### Scenario: Create Product (Modified)
- GIVEN an admin is in the products management section for a specific restaurant
- WHEN the admin creates a product with name, description, price, category, and image
- THEN the system SHALL create the product record with `restauranteId` set
- AND the product SHALL be associated with the selected category within that restaurant

#### Scenario: Delete Product (Modified)
- GIVEN an admin is deleting an existing product
- WHEN the admin confirms the deletion
- THEN the system SHALL soft-delete the product scoped to its restaurant
- AND the product SHALL be hidden from that restaurant's customer menu
- AND existing orders containing the product SHALL be preserved

### Requirement: Offline Menu Access (Modified — Restaurant Scoped)
The system SHALL cache menu data per restaurant to enable offline browsing.

#### Scenario: Access Menu While Offline (Modified)
- GIVEN the customer has previously loaded Restaurant A's menu while online
- WHEN the customer opens the application while offline
- THEN the system SHALL load Restaurant A's cached menu from the restaurant-specific IndexedDB key
- AND the system SHALL NOT load menu data from other restaurants

#### Scenario: Menu Data Sync on Reconnect (Modified)
- GIVEN the customer is online and has stale cached menu data for Restaurant A
- WHEN the application detects network connectivity
- THEN the system SHALL fetch updated menu data for Restaurant A from Supabase
- AND the system SHALL update only the Restaurant A IndexedDB cache
- AND other restaurants' caches SHALL NOT be affected

---

## REMOVED Requirements

### Requirement: Usuario.restauranteId Unique Constraint (REMOVED)
The system SHALL NOT enforce a single `restauranteId` on the `Usuario` table.

#### Scenario: User Without Single Restaurant (REMOVED)
- GIVEN the previous requirement where a user had exactly one `restauranteId`
- WHEN this requirement is removed
- THEN the `restauranteId` column SHALL be removed from `usuarios`
- AND users SHALL access restaurants through `usuario_restaurantes` junction table only

---

## DDD Architecture Requirements (from implantacao-ddd)

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