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

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
