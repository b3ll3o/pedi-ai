# Delta for multi-restaurante

## In Scope

1. **Relacionamento N:N Usuario↔Restaurante**
   - Criar tabela de junction `usuario_restaurantes` (usuarioId, restauranteId, papel no restaurante)
   - Atualizar `Usuario` para remover campo `restauranteId` único
   - Migrar dados existentes

2. **CRUD de Restaurantes (Admin)**
   - Criar restaurante (nome, CNPJ, endereço, telefone, logo)
   - Listar restaurantes do owner logado
   - Editar dados do restaurante
   - Desativar restaurante (soft delete)
   - Vincular/desvincular usuários (managers/staff) a cada restaurante

3. **CRUD de Cardápio por Restaurante (Admin)**
   - Cada restaurante tem categorias, produtos, grupos de modificadores e combos independentes
   - Adicionar produto ao cardápio
   - Editar produto
   - Retirar do menu (soft delete)
   - Apagar produto (hard delete)
   - CRUD de categorias
   - CRUD de grupos de modificadores e valores

4. **UI de Admin — Seletor de Restaurante**
   - Sidebar/widget no admin para trocar entre restaurantes
   - Filtro de restaurante ativo em todas as telas de gestão

5. **Sincronização Offline**
   - Cardápio offline isolado por restaurante (IndexedDB key inclui restauranteId)
   - Pedidos offline vinculados ao restaurante correto

## Out of Scope

- Login/logout, autenticação e gestão de sessão (já existe)
- Multi-restaurante para **cliente** (cliente escolhe restaurante ao acessar)
- Unified menu que agrega produtos de vários restaurantes
- Faturação ou gestão financeira cross-restaurante
- Transferência de propriedade de restaurante entre owners
- Relatórios consolidados entre restaurantes

## Data Model Changes

### New Table: `usuario_restaurantes`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() |
| usuario_id | UUID | NOT NULL, REFERENCES usuarios(id) ON DELETE CASCADE |
| restaurante_id | UUID | NOT NULL, REFERENCES restaurantes(id) ON DELETE CASCADE |
| papel | VARCHAR(20) | NOT NULL, DEFAULT 'staff' |
| criado_em | TIMESTAMPTZ | DEFAULT NOW() |
| | | UNIQUE(usuario_id, restaurante_id) |

**Indexes:**
- `idx_usuario_restaurantes_usuario` on (usuario_id)
- `idx_usuario_restaurantes_restaurante` on (restaurante_id)

### Table: `usuarios`

**REMOVED:**
- Column `restaurante_id` (moved to junction table)

### New Column on Menu Tables

| Table | New Column | Reference |
|-------|------------|-----------|
| categorias | restaurante_id | REFERENCES restaurantes(id) |
| itens_cardapio | restaurante_id | REFERENCES restaurantes(id) |
| grupos_modificadores | restaurante_id | REFERENCES restaurantes(id) |
| modificador_valores | restaurante_id | REFERENCES restaurantes(id) |
| combos | restaurante_id | REFERENCES restaurantes(id) |

## API Changes

### Admin API — Restaurant Management

| Endpoint | Method | Description | Auth Role |
|----------|--------|-------------|-----------|
| `/api/admin/restaurants` | GET | List restaurants for current owner | owner |
| `/api/admin/restaurants` | POST | Create new restaurant | owner |
| `/api/admin/restaurants/[id]` | GET | Get restaurant details | owner, manager, staff (own restaurant) |
| `/api/admin/restaurants/[id]` | PUT | Update restaurant | owner |
| `/api/admin/restaurants/[id]` | DELETE | Soft delete restaurant (ativo=false) | owner |
| `/api/admin/restaurants/[id]/team` | GET | List team members | owner, manager |
| `/api/admin/restaurants/[id]/team` | POST | Link user to restaurant | owner, manager |
| `/api/admin/restaurants/[id]/team/[userId]` | DELETE | Unlink user from restaurant | owner, manager |

### Admin API — Menu Management (scoped by restaurant)

| Endpoint | Method | Description | Auth Role |
|----------|--------|-------------|-----------|
| `/api/admin/restaurants/[id]/categories` | GET | List categories | owner, manager, staff |
| `/api/admin/restaurants/[id]/categories` | POST | Create category | owner, manager |
| `/api/admin/restaurants/[id]/categories/[catId]` | PUT | Update category | owner, manager |
| `/api/admin/restaurants/[id]/categories/[catId]` | DELETE | Soft delete category | owner, manager |
| `/api/admin/restaurants/[id]/products` | GET | List products | owner, manager, staff |
| `/api/admin/restaurants/[id]/products` | POST | Create product | owner, manager |
| `/api/admin/restaurants/[id]/products/[prodId]` | PUT | Update product | owner, manager |
| `/api/admin/restaurants/[id]/products/[prodId]` | DELETE | Soft delete product | owner, manager |
| `/api/admin/restaurants/[id]/products/[prodId]/hard-delete` | DELETE | Hard delete product | owner |
| `/api/admin/restaurants/[id]/modifier-groups` | GET | List modifier groups | owner, manager, staff |
| `/api/admin/restaurants/[id]/modifier-groups` | POST | Create modifier group | owner, manager |
| `/api/admin/restaurants/[id]/modifier-groups/[grpId]` | PUT | Update modifier group | owner, manager |
| `/api/admin/restaurants/[id]/modifier-groups/[grpId]` | DELETE | Soft delete modifier group | owner, manager |

## Events

### Domain Events

| Event | Trigger | Data |
|-------|---------|------|
| `RestauranteCriadoEvent` | Owner creates a new restaurant | `{ restauranteId, ownerId, nome, criadoEm }` |
| `RestauranteAtualizadoEvent` | Restaurant data is updated | `{ restauranteId, changes, atualizadoEm }` |
| `RestauranteDesativadoEvent` | Owner deactivates a restaurant | `{ restauranteId, desativadoEm }` |
| `UsuarioVinculadoRestauranteEvent` | User is linked to a restaurant | `{ usuarioId, restauranteId, papel, vinculadoEm }` |
| `UsuarioDesvinculadoRestauranteEvent` | User is unlinked from a restaurant | `{ usuarioId, restauranteId, desvinculadoEm }` |
| `CardapioAtualizadoEvent` | Menu data changes (products, categories, modifiers) | `{ restauranteId, tipoAlteracao, itemId, atualizadoEm }` |

---

## ADDED Requirements

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

### Requirement: Restaurant CRUD Operations
The system SHALL provide full CRUD operations for restaurant management.

#### Scenario: Create Restaurant
- GIVEN an owner is on the restaurant creation page
- WHEN the owner fills in the form with valid data (nome, CNPJ, endereço, telefone, logo)
- THEN the system SHALL validate all required fields
- AND the system SHALL create the restaurant record
- AND the system SHALL link the owner to the restaurant
- AND the user SHALL be redirected to the new restaurant's admin page

#### Scenario: Update Restaurant Data
- GIVEN an owner is editing an existing restaurant
- WHEN the owner modifies restaurant fields and submits
- THEN the system SHALL update the `Restaurante` record
- AND the system SHALL emit `RestauranteAtualizadoEvent`
- AND changes SHALL be visible immediately in the admin panel

#### Scenario: Deactivate Restaurant (Soft Delete)
- GIVEN an owner is on the restaurant edit page
- WHEN the owner clicks "Desativar Restaurante"
- THEN the system SHALL set `restaurante.ativo = false`
- AND the system SHALL emit `RestauranteDesativadoEvent`
- AND the restaurant SHALL disappear from the restaurant selector for non-owner users
- AND existing orders SHALL remain intact
- AND the restaurant SHALL still appear in historical data

#### Scenario: List Team Members
- GIVEN an owner or manager is viewing the team management page
- WHEN the page loads
- THEN the system SHALL return all `UsuarioRestaurante` records for the restaurant
- AND each record SHALL include the user's name, email, and role

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

### Requirement: Menu CRUD Per Restaurant
The system SHALL provide full CRUD operations for menu entities scoped to a specific restaurant.

#### Scenario: Create Category for Restaurant
- GIVEN an admin is in the category management section for a specific restaurant
- WHEN the admin creates a new category
- THEN the category SHALL be created with `restauranteId` set to the current context
- AND the category SHALL only appear for that restaurant

#### Scenario: Create Product for Restaurant
- GIVEN an admin is in the product management section for a specific restaurant
- WHEN the admin creates a new product
- THEN the product SHALL be created with `restauranteId` set to the current context
- AND the product SHALL only appear in that restaurant's menu

#### Scenario: Remove Product from Menu (Soft Delete)
- GIVEN an admin is editing a product
- WHEN the admin clicks "Retirar do Menu"
- THEN the system SHALL set `item.ativo = false`
- AND the product SHALL disappear from the customer-facing menu
- AND the product SHALL remain in historical orders
- AND the product SHALL still be visible in admin with "Inativo" badge

#### Scenario: Hard Delete Product
- GIVEN an admin is viewing an inactive product in admin
- WHEN the admin clicks "Apagar Permanentemente"
- THEN the system SHALL verify the product has never been ordered OR X days have passed since last order
- AND if conditions are met, the system SHALL permanently delete the record
- AND if conditions are NOT met, the system SHALL return error "Produto não pode ser excluído: possui histórico de pedidos"

#### Scenario: CRUD Modifier Groups for Restaurant
- GIVEN an admin is managing modifier groups for a specific restaurant
- WHEN the admin creates/updates/deletes a modifier group
- THEN the operation SHALL be scoped to the current restaurant
- AND modifier groups SHALL only appear for products in that restaurant

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

## UI Requirements

### Restaurant Selector Component
- The system SHALL display a `RestaurantSelector` component in the admin sidebar or header
- The selector SHALL show the currently active restaurant name
- The selector SHALL display a dropdown list of all restaurants the user can access
- Switching restaurants SHALL update the admin context immediately
- The selector SHALL NOT allow switching if there are unsaved changes (with confirmation dialog)

### Restaurant List Page (`/admin/restaurants`)
- The page SHALL display all restaurants the current user owns or manages
- Each restaurant card SHALL show: name, CNPJ, address, status (active/inactive), team member count
- The page SHALL provide buttons to: Create New Restaurant, Edit, Manage Team, Deactivate
- Deactivated restaurants SHALL be visually marked (greyed out or with badge)

### Restaurant Form Page (`/admin/restaurants/new`, `/admin/restaurants/[id]/edit`)
- The form SHALL include fields: Nome (required), CNPJ (required, validated), Endereço, Telefone, Logo upload
- Form validation SHALL show inline errors in Portuguese
- The form SHALL prevent submission with invalid data

### Team Management Page (`/admin/restaurants/[id]/team`)
- The page SHALL list all users linked to the restaurant with their roles
- The page SHALL allow searching users by email to add new members
- The page SHALL allow selecting a role (manager, staff) when adding a member
- The page SHALL allow removing members (except the owner)
- Owner SHALL be clearly marked and not removable

### Menu Management Pages (categories, products, modifiers)
- All menu management pages SHALL include a restaurant indicator
- Pages SHALL automatically filter content by the current restaurant context
- If no restaurant is selected, pages SHALL show a prompt to select a restaurant

### Visual Indicators
- Restaurant selector SHALL highlight the current restaurant
- Restaurant context SHALL be visible in the page header or breadcrumb
- Switching restaurants SHALL show a brief loading indicator while fetching new data

---

## Migration Plan

### Phase 1: Database Migration
1. Create `usuario_restaurantes` table
2. Migrate existing `usuarios.restaurante_id` to junction table (owner role)
3. Add `restaurante_id` columns to menu tables
4. Backfill `restaurante_id` on menu tables from existing restaurant context
5. Remove `restaurante_id` from `usuarios`

### Phase 2: Domain Layer Updates
1. Create `UsuarioRestaurante` entity
2. Update repository interfaces to filter by `restauranteId`
3. Add restaurant-scoped use cases

### Phase 3: Infrastructure Updates
1. Update Dexie schemas to include `restauranteId`
2. Update Supabase queries with `restauranteId` filters
3. Implement isolated offline sync per restaurant

### Phase 4: Presentation Layer Updates
1. Add restaurant selector component
2. Update admin pages to use restaurant context
3. Add restaurant management pages

### Phase 5: Rollback Capability
1. Maintain feature flag `ENABLE_MULTI_RESTAURANT`
2. Keep legacy code path when flag is false
3. Validate all flows before full deployment
