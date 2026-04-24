# Delta for Admin Domain

## ADDED Requirements

### Requirement: Admin Authentication Integration
The system SHALL enforce authentication for all admin panel access via middleware.

#### Scenario: Unauthenticated Access to Admin
- GIVEN an unauthenticated user attempts to access any /admin/* route
- WHEN the request is received
- THEN the middleware SHALL redirect the user to /admin/login
- AND the original URL SHALL be preserved for post-login redirect

#### Scenario: Authenticated Access Granted
- GIVEN an authenticated user with valid session accesses /admin/dashboard
- WHEN the middleware validates the session
- THEN the user SHALL be granted access to the requested route

#### Scenario: Session Expiry During Admin Session
- GIVEN an admin user has an active session that expires
- WHEN the user makes a request after session expiry
- THEN the middleware SHALL return 401 Unauthorized
- AND the user SHALL be redirected to login

### Requirement: Role-Based Access Control Enforcement
The system SHALL enforce role-based permissions on all admin API endpoints.

#### Scenario: Owner Access to All Admin Features
- GIVEN a user with the "owner" role makes API requests to any admin endpoint
- WHEN the request is received
- THEN the system SHALL grant access to all CRUD operations
- AND the system SHALL allow access to analytics and settings endpoints

#### Scenario: Manager Access to Permitted Features
- GIVEN a user with the "manager" role makes API requests
- WHEN the request targets categories, products, modifiers, combos, tables, or orders
- THEN the system SHALL grant access
- WHEN the request targets user management or restaurant settings
- THEN the system SHALL return 403 Forbidden

#### Scenario: Staff Access Limited to Orders
- GIVEN a user with the "staff" role makes API requests
- WHEN the request targets orders endpoints
- THEN the system SHALL grant read access to orders
- WHEN the request targets menu, tables, users, or settings
- THEN the system SHALL return 403 Forbidden

### Requirement: Dynamic Restaurant Context
The system SHALL use the authenticated user's restaurant_id for all admin operations.

#### Scenario: Restaurant ID from Session
- GIVEN an admin user is logged in
- WHEN the user makes any admin API request
- THEN the system SHALL extract restaurant_id from the user's session
- AND the system SHALL NOT use hardcoded "demo-restaurant" values

#### Scenario: Restaurant-Scoped Data Access
- GIVEN an admin user is logged in with restaurant_id = "rest_123"
- WHEN the user requests categories, products, or any restaurant-scoped data
- THEN the system SHALL return only data where restaurant_id = "rest_123"
- AND the system SHALL filter out data from other restaurants

### Requirement: URL Consistency in Admin Navigation
The system SHALL maintain consistent URL naming between AdminLayout navigation and actual routes.

#### Scenario: Navigation Links Match Routes
- GIVEN the AdminLayout component defines navigation links
- WHEN the admin navigates using the sidebar menu
- THEN each link SHALL point to the correct existing route
- AND broken links SHALL be fixed or removed

---

## MODIFIED Requirements

### Requirement: Category CRUD (from main spec)
The existing Category CRUD requirements from `openspec/specs/admin/spec.md` SHALL be fully implemented with API integration.

#### Scenario: Create Category via API
- GIVEN an admin is in the categories management section
- WHEN the admin submits the category creation form
- THEN the system SHALL call POST /api/admin/categories
- AND the API SHALL validate required fields (name, display_order)
- AND the API SHALL create the category with restaurant_id from session
- AND the response SHALL include the created category with id

#### Scenario: Update Category via API
- GIVEN an admin is editing an existing category
- WHEN the admin submits the category update form
- THEN the system SHALL call PUT /api/admin/categories/[id]
- AND the API SHALL validate ownership (restaurant_id match)
- AND the API SHALL return the updated category

#### Scenario: Delete Category with Soft Delete
- GIVEN an admin is deleting an existing category
- WHEN the admin confirms the deletion
- THEN the system SHALL call DELETE /api/admin/categories/[id]
- AND the API SHALL set is_active = false (soft delete)
- AND products in the category SHALL be hidden from customer menu
- AND the category record SHALL be preserved for historical orders

#### Scenario: Reorder Categories
- GIVEN an admin is in the categories management section
- WHEN the admin changes the display_order via drag-drop or input
- THEN the system SHALL call PATCH /api/admin/categories/reorder
- AND the body SHALL include an array of {id, display_order} objects
- AND all affected categories SHALL be updated atomically

### Requirement: Product CRUD (from main spec)
The existing Product CRUD requirements from `openspec/specs/admin/spec.md` SHALL be fully implemented with API integration.

#### Scenario: Create Product via API
- GIVEN an admin is in the products management section
- WHEN the admin submits the product creation form with name, description, price, category_id, and image
- THEN the system SHALL call POST /api/admin/products
- AND the API SHALL validate required fields and category ownership
- AND the API SHALL create the product with restaurant_id from session
- AND dietary labels SHALL be stored as an array

#### Scenario: Update Product via API
- GIVEN an admin is editing an existing product
- WHEN the admin submits the product update form
- THEN the system SHALL call PUT /api/admin/products/[id]
- AND the API SHALL validate ownership
- AND changes SHALL be reflected immediately in the customer menu

#### Scenario: Delete Product with Soft Delete
- GIVEN an admin is deleting an existing product
- WHEN the admin confirms the deletion
- THEN the system SHALL call DELETE /api/admin/products/[id]
- AND the API SHALL set is_active = false
- AND existing orders containing the product SHALL be preserved

### Requirement: Modifier Group CRUD (from main spec)
The existing Modifier Group requirements from `openspec/specs/admin/spec.md` SHALL be fully implemented with API integration.

#### Scenario: Create Modifier Group via API
- GIVEN an admin is editing a product
- WHEN the admin creates a modifier group with name, required flag, min/max selections
- THEN the system SHALL call POST /api/admin/modifiers
- AND the system SHALL allow adding modifier values to the group

#### Scenario: Modifier Group Required Validation
- GIVEN a modifier group is marked as required
- WHEN a customer adds the product to cart without selecting modifiers
- THEN the cart SHALL prevent adding until required modifiers are selected

### Requirement: Modifier Value CRUD (from main spec)
The existing Modifier Value requirements from `openspec/specs/admin/spec.md` SHALL be fully implemented.

#### Scenario: Add Modifier Value via API
- GIVEN an admin is editing a modifier group
- WHEN the admin adds a modifier value with name and price adjustment
- THEN the system SHALL call POST /api/admin/modifiers/[groupId]/values
- AND the modifier SHALL appear in the customer product view

#### Scenario: Update Modifier Value Price via API
- GIVEN an admin is editing a modifier value
- WHEN the admin changes the price adjustment
- THEN the system SHALL call PUT /api/admin/modifiers/values/[id]
- AND the new price adjustment SHALL apply to new orders

### Requirement: Combo CRUD (from main spec)
The existing Combo requirements from `openspec/specs/admin/spec.md` SHALL be fully implemented with API integration.

#### Scenario: Create Combo via API
- GIVEN an admin is in the combos management section
- WHEN the admin creates a combo with name, bundle price, and linked products
- THEN the system SHALL call POST /api/admin/combos
- AND the combo SHALL be associated with linked products via combo_items

#### Scenario: Combo Bundle Pricing in Cart
- GIVEN a combo has a bundle price set
- WHEN a customer adds the combo to cart
- THEN the cart SHALL use the bundle price instead of individual product prices

### Requirement: Order Management (from main spec)
The existing Order Management requirements from `openspec/specs/admin/spec.md` SHALL be fully implemented with API integration.

#### Scenario: List Orders with Filters via API
- GIVEN an admin is in the orders management section
- WHEN the admin views the order list
- THEN the system SHALL call GET /api/admin/orders with query params
- AND the API SHALL support filtering by status (pending, paid, preparing, ready, delivered, cancelled)
- AND the API SHALL support filtering by date range
- AND the response SHALL include order summary (id, status, date, table, total)

#### Scenario: View Order Details via API
- GIVEN an admin is viewing the order list
- WHEN the admin clicks on an order
- THEN the system SHALL call GET /api/admin/orders/[id]
- AND the response SHALL include all items, modifiers, and status history
- AND the response SHALL use restaurant_id from session (not hardcoded)

#### Scenario: Update Order Status via API
- GIVEN an admin is viewing order details
- WHEN the admin updates the order status
- THEN the system SHALL call PATCH /api/admin/orders/[id]/status
- AND the API SHALL validate the status transition
- AND the system SHALL record status change in order_status_history

### Requirement: Analytics Dashboard (from main spec)
The existing Analytics requirements from `openspec/specs/admin/spec.md` SHALL be fully implemented.

#### Scenario: View Orders Per Period via API
- GIVEN an admin is on the dashboard
- WHEN the admin views the analytics section
- THEN the system SHALL call GET /api/admin/analytics/orders
- AND the API SHALL return orders count grouped by day/week/month
- AND the API SHALL return total revenue for the period
- AND the data SHALL be filtered by restaurant_id from session

#### Scenario: View Popular Items via API
- GIVEN an admin is on the dashboard
- WHEN the admin views the popular items chart
- THEN the system SHALL call GET /api/admin/analytics/popular-items
- AND the API SHALL return top 10 products by order frequency
- AND the data SHALL cover the selected time period

### Requirement: Table Management (from main spec)
The existing Table Management requirements from `openspec/specs/admin/spec.md` SHALL be fully implemented with API integration.

#### Scenario: CRUD Operations for Tables via API
- GIVEN an admin is in the tables management section
- WHEN the admin creates, updates, or deactivates a table
- THEN the system SHALL use API endpoints /api/admin/tables
- AND all operations SHALL be scoped to restaurant_id from session

#### Scenario: QR Code Download
- GIVEN an admin has generated a QR code for a table
- WHEN the admin clicks download
- THEN the system SHALL provide the QR code as a PNG file
- AND the filename SHALL include the table label

### Requirement: User Management (from main spec)
The existing User Management requirements from `openspec/specs/admin/spec.md` SHALL be fully implemented with API integration.

#### Scenario: List Users via API
- GIVEN an admin with owner role is in the users management section
- WHEN the admin views the user list
- THEN the system SHALL call GET /api/admin/users
- AND the response SHALL include all users for the restaurant
- AND each user SHALL display role, email, and created_at

#### Scenario: Create Staff User via API
- GIVEN an admin with owner role is creating a new staff user
- WHEN the admin submits the user creation form
- THEN the system SHALL call POST /api/admin/users
- AND the API SHALL create the user in Supabase Auth
- AND the API SHALL assign the specified role

### Requirement: Settings Page
The system SHALL provide a settings page for restaurant configuration.

#### Scenario: Access Settings Page
- GIVEN an admin with owner role navigates to settings
- WHEN the settings page loads
- THEN the system SHALL display restaurant configuration options
- AND only owner role SHALL have access to this page

---

## REMOVED Requirements

None.