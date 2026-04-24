# Delta for E2E Domain

## ADDED Requirements

### Requirement: E2E Test Selectors
All interactive components MUST have unique `data-testid` attributes to enable E2E test targeting.

#### Scenario: Admin Page Components Have Test IDs
- GIVEN an admin page renders interactive elements
- WHEN the page is loaded
- THEN all buttons, inputs, links, and interactive elements MUST have unique `data-testid` attributes
- AND the `data-testid` values MUST follow the pattern `{page}-{element}-{index}` (e.g., `categories-add-button`, `products-name-input`)

#### Scenario: Customer Page Components Have Test IDs
- GIVEN a customer-facing page renders interactive elements
- WHEN the page is loaded
- THEN all buttons, inputs, links, and interactive elements MUST have unique `data-testid` attributes
- AND the `data-testid` values MUST follow the pattern `{page}-{element}-{index}` (e.g., `menu-product-card-1`, `cart-checkout-button`)

#### Scenario: Kitchen Display Has Test IDs
- GIVEN the kitchen display page renders
- WHEN the page is loaded
- THEN all order cards, status buttons, and interactive elements MUST have unique `data-testid` attributes
- AND the `data-testid` values MUST follow the pattern `kitchen-{element}-{orderId}` (e.g., `kitchen-order-card-123`, `kitchen-ready-button-123`)

### Requirement: E2E Page Stubs
The system MUST provide page stubs for all routes referenced by E2E tests to prevent navigation failures.

#### Scenario: Customer Menu Page Exists
- GIVEN an E2E test navigates to `/menu` or `/cardapio`
- WHEN the route is accessed
- THEN the system MUST render a menu page component
- AND the page MUST contain appropriate `data-testid` attributes for all interactive elements

#### Scenario: Customer Checkout Page Exists
- GIVEN an E2E test navigates to `/checkout`
- WHEN the route is accessed
- THEN the system MUST render a checkout page component
- AND the page MUST display cart summary and payment method selection
- AND the page MUST contain appropriate `data-testid` attributes

#### Scenario: Kitchen Display Page Exists
- GIVEN an E2E test navigates to `/kitchen` or `/cozinha`
- WHEN the route is accessed
- THEN the system MUST render a kitchen display page component
- AND the page MUST display pending orders
- AND the page MUST contain appropriate `data-testid` attributes

#### Scenario: Customer Order Status Page Exists
- GIVEN an E2E test navigates to `/order/{id}` or `/pedido/{id}`
- WHEN the route is accessed
- THEN the system MUST render an order status page component
- AND the page MUST display order details and current status
- AND the page MUST contain appropriate `data-testid` attributes

### Requirement: E2E Route Consistency
The system MUST use consistent route patterns across admin and customer interfaces.

#### Scenario: Admin Routes Use /admin Prefix
- GIVEN an E2E test navigates to admin routes
- WHEN the routes are accessed
- THEN all admin routes MUST be prefixed with `/admin/` (e.g., `/admin/categories`, `/admin/products`)
- AND routes without `/admin/` prefix MUST NOT render admin pages

#### Scenario: Customer Routes Do Not Conflict with Admin Routes
- GIVEN customer and admin routes coexist
- WHEN routes are defined
- THEN customer routes MUST NOT use `/admin/` prefix
- AND there MUST be no route conflicts between admin and customer interfaces

### Requirement: E2E Auth Mocks
The system MUST provide authentication states that E2E tests can rely upon.

#### Scenario: Admin Auth State for Tests
- GIVEN an E2E test requires an authenticated admin session
- WHEN the test sets up the auth state
- THEN the system MUST allow tests to bypass Supabase Auth via mock providers
- AND the mock MUST provide a valid session with admin role claims

#### Scenario: Customer Auth State for Tests
- GIVEN an E2E test requires a customer session
- WHEN the test sets up the auth state
- THEN the system MUST allow tests to set a customer session
- AND the session SHOULD be a guest session or authenticated customer session

### Requirement: E2E Error Message Language
The system MUST display error messages in Portuguese (pt-BR) for all user-facing text.

#### Scenario: Portuguese Error Messages
- GIVEN a customer encounters an error (validation, network, payment)
- WHEN the error is displayed
- THEN the error message MUST be in Portuguese
- AND the message MUST use consistent terminology (e.g., "Campo obrigatório", "Erro de conexão", "Pagamento recusado")

#### Scenario: Portuguese Success Messages
- GIVEN a customer completes an action (add to cart, place order, payment success)
- WHEN the success is displayed
- THEN the success message MUST be in Portuguese
- AND the message MUST use consistent terminology (e.g., "Item adicionado ao carrinho", "Pedido realizado com sucesso")

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
