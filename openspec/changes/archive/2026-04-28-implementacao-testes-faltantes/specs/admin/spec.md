# Delta for Admin Testing

## ADDED Requirements

### Requirement: Modifier Group CRUD Unit Tests
The system MUST have unit tests for modifier group use cases.

#### Scenario: Unit test for CriarGrupoModificadorUseCase
- GIVEN `CriarGrupoModificadorUseCase` exists
- WHEN executed with valid modifier group data
- THEN it SHALL create the group in the database
- AND it SHALL return the created group with ID

#### Scenario: Unit test for AtualizarGrupoModificadorUseCase
- GIVEN `AtualizarGrupoModificadorUseCase` exists
- WHEN executed with valid update data
- THEN it SHALL update the group in the database
- AND it SHALL return the updated group

#### Scenario: Unit test for ExcluirGrupoModificadorUseCase
- GIVEN `ExcluirGrupoModificadorUseCase` exists
- WHEN executed with a valid group ID
- THEN it SHALL soft-delete the group
- AND it SHALL NOT hard-delete (preserve for historical orders)

### Requirement: Modifier Value CRUD Unit Tests
The system MUST have unit tests for modifier value use cases.

#### Scenario: Unit test for CriarValorModificadorUseCase
- GIVEN `CriarValorModificadorUseCase` exists
- WHEN executed with valid modifier value data
- THEN it SHALL create the value in the database
- AND it SHALL return the created value with ID

#### Scenario: Unit test for AtualizarValorModificadorUseCase
- GIVEN `AtualizarValorModificadorUseCase` exists
- WHEN executed with valid update data
- THEN it SHALL update the value in the database
- AND it SHALL return the updated value

#### Scenario: Unit test for ExcluirValorModificadorUseCase
- GIVEN `ExcluirValorModificadorUseCase` exists
- WHEN executed with a valid value ID
- THEN it SHALL soft-delete the value

### Requirement: E2E test for modifier group management
The system MUST have E2E tests for complete modifier group CRUD workflow.

#### Scenario: E2E - Create modifier group
- GIVEN an admin is editing a product
- WHEN the admin creates a new modifier group with name, required flag, and values
- THEN the group SHALL be saved and appear in the product's modifier list
- AND the group SHALL be available when adding to cart

#### Scenario: E2E - Edit modifier group
- GIVEN an admin is viewing an existing modifier group
- WHEN the admin updates the group's name or required flag
- THEN the changes SHALL be saved and reflected immediately

#### Scenario: E2E - Delete modifier group
- GIVEN an admin is viewing an existing modifier group
- WHEN the admin deletes the group
- THEN the group SHALL be soft-deleted
- AND existing orders SHALL retain the modifier data

### Requirement: E2E test for modifier value management
The system MUST have E2E tests for complete modifier value workflow.

#### Scenario: E2E - Add modifier value to group
- GIVEN an admin is editing a modifier group
- WHEN the admin adds a new value with name and price adjustment
- THEN the value SHALL be saved and appear in the group's value list

#### Scenario: E2E - Edit modifier value price
- GIVEN an admin is editing a modifier value
- WHEN the admin changes the price adjustment
- THEN the new price SHALL apply to new orders

#### Scenario: E2E - Remove modifier value
- GIVEN an admin is editing a modifier group with multiple values
- WHEN the admin removes a value
- THEN the value SHALL be soft-deleted

### Requirement: Analytics Unit Tests
The system MUST have unit tests for analytics service.

#### Scenario: Unit test for AnalyticsService.getItensMaisVendidos
- GIVEN `AnalyticsService.getItensMaisVendidos()` exists
- WHEN called with a restaurant ID and date range
- THEN it SHALL return the top 10 products by order frequency
- AND it SHALL respect the date range filter

#### Scenario: Unit test for AnalyticsService.getPedidosPorPeriodo
- GIVEN `AnalyticsService.getPedidosPorPeriodo()` exists
- WHEN called with a restaurant ID and period
- THEN it SHALL return orders grouped by day/week/month
- AND it SHALL include total revenue per period

### Requirement: E2E test for analytics dashboard
The system MUST have E2E tests for the analytics dashboard.

#### Scenario: E2E - View popular items report
- GIVEN an admin is on the analytics dashboard
- WHEN the admin selects "Itens mais vendidos"
- THEN the system SHALL display a chart with top 10 products
- AND the data SHALL match orders in the selected period

#### Scenario: E2E - View orders per period
- GIVEN an admin is on the analytics dashboard
- WHEN the admin selects a date range
- THEN the system SHALL display orders grouped by day
- AND the total revenue SHALL be calculated correctly

### Requirement: Restaurant Reactivate Unit Tests
The system MUST have unit tests for restaurant reactivation.

#### Scenario: Unit test for ReativarRestauranteUseCase
- GIVEN `ReativarRestauranteUseCase` exists
- WHEN executed with a valid restaurant ID
- THEN it SHALL update the restaurant status to active
- AND it SHALL return the updated restaurant

### Requirement: E2E test for restaurant reactivation
The system MUST have E2E tests for restaurant reactivation.

#### Scenario: E2E - Reactivate disabled restaurant
- GIVEN an admin has disabled a restaurant
- WHEN the admin selects "Reativar" on the restaurant
- THEN the restaurant SHALL become active again
- AND it SHALL appear in the customer-facing menu
