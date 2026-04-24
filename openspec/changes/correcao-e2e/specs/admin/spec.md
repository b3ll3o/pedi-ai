# Delta for Admin Domain

## ADDED Requirements

### Requirement: Admin Page Data-TestID Selectors
All admin page components MUST have `data-testid` attributes for E2E test targeting.

#### Scenario: Categories Page Has Test IDs
- GIVEN the admin categories page is rendered
- WHEN the page loads
- THEN the category list MUST have `data-testid="categories-list"`
- AND each category row MUST have `data-testid="categories-row-{id}"`
- AND the add button MUST have `data-testid="categories-add-button"`
- AND the edit button for each row MUST have `data-testid="categories-edit-button-{id}"`
- AND the delete button for each row MUST have `data-testid="categories-delete-button-{id}"`

#### Scenario: Products Page Has Test IDs
- GIVEN the admin products page is rendered
- WHEN the page loads
- THEN the product list MUST have `data-testid="products-list"`
- AND each product row MUST have `data-testid="products-row-{id}"`
- AND the add button MUST have `data-testid="products-add-button"`
- AND the edit button for each row MUST have `data-testid="products-edit-button-{id}"`
- AND the delete button for each row MUST have `data-testid="products-delete-button-{id}"`

#### Scenario: Orders Page Has Test IDs
- GIVEN the admin orders page is rendered
- WHEN the page loads
- THEN the order list MUST have `data-testid="orders-list"`
- AND each order row MUST have `data-testid="orders-row-{id}"`
- AND the view button for each row MUST have `data-testid="orders-view-button-{id}"`
- AND the status select for each row MUST have `data-testid="orders-status-select-{id}"`

#### Scenario: Tables Page Has Test IDs
- GIVEN the admin tables page is rendered
- WHEN the page loads
- THEN the table list MUST have `data-testid="tables-list"`
- AND each table row MUST have `data-testid="tables-row-{id}"`
- AND the add button MUST have `data-testid="tables-add-button"`
- AND the QR code download button for each row MUST have `data-testid="tables-qr-button-{id}"`

### Requirement: Admin Logout Button
All admin pages MUST display a logout button accessible via `data-testid="admin-logout-button"`.

#### Scenario: Logout Button on Dashboard
- GIVEN an admin user is logged in and viewing the dashboard
- WHEN the dashboard renders
- THEN a logout button MUST be visible with `data-testid="admin-logout-button"`

#### Scenario: Logout Button on Categories Page
- GIVEN an admin user is logged in and viewing the categories page
- WHEN the page renders
- THEN a logout button MUST be visible with `data-testid="admin-logout-button"`

#### Scenario: Logout Button on Products Page
- GIVEN an admin user is logged in and viewing the products page
- WHEN the page renders
- THEN a logout button MUST be visible with `data-testid="admin-logout-button"`

#### Scenario: Logout Button on Orders Page
- GIVEN an admin user is logged in and viewing the orders page
- WHEN the page renders
- THEN a logout button MUST be visible with `data-testid="admin-logout-button"`

### Requirement: Admin Route Consistency
Admin routes MUST consistently use the `/admin/` prefix.

#### Scenario: Admin Categories Route
- GIVEN an admin navigates to `/admin/categories`
- WHEN the route is accessed
- THEN the categories management page MUST be rendered
- AND the page MUST be protected by authentication

#### Scenario: Admin Products Route
- GIVEN an admin navigates to `/admin/products`
- WHEN the route is accessed
- THEN the products management page MUST be rendered
- AND the page MUST be protected by authentication

#### Scenario: Admin Orders Route
- GIVEN an admin navigates to `/admin/orders`
- WHEN the route is accessed
- THEN the orders management page MUST be rendered
- AND the page MUST be protected by authentication

#### Scenario: Admin Tables Route
- GIVEN an admin navigates to `/admin/tables`
- WHEN the route is accessed
- THEN the tables management page MUST be rendered
- AND the page MUST be protected by authentication

### Requirement: Admin Form Validation Messages
Admin forms MUST display validation error messages in Portuguese.

#### Scenario: Required Field Validation
- GIVEN an admin submits a form with empty required fields
- WHEN the form is validated
- THEN error messages MUST be displayed in Portuguese
- AND messages MUST use "Campo obrigatório" for required field errors

#### Scenario: Unique Field Validation
- GIVEN an admin submits a form with a duplicate name
- WHEN the form is validated
- THEN error messages MUST be displayed in Portuguese
- AND messages MUST indicate the field value already exists

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
