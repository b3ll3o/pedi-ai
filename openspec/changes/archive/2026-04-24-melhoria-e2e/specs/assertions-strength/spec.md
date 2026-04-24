# Delta for Assertions Strength

## ADDED Requirements

### Requirement: Order Filters SHALL Have Result Count Assertions
Tests SHALL assert on the number of results returned when filtering orders.

#### Scenario: Filter Orders by Status Returns Expected Count
- GIVEN the admin orders page is displaying a list of orders
- WHEN the admin filters by a specific status (e.g., "pending")
- THEN the system SHALL return only orders with that status
- AND the test SHALL assert that the returned count matches the expected number
- AND the test SHALL verify each visible order has the selected status

#### Scenario: Filter Orders by Date Range Returns Expected Count
- GIVEN the admin orders page is displaying a list of orders
- WHEN the admin filters by a date range
- THEN the system SHALL return only orders within that date range
- AND the test SHALL assert the count of returned orders

#### Scenario: Search Orders by Customer Email Returns Matching Results Only
- GIVEN the admin orders page is displaying a list of orders
- WHEN the admin searches by customer email
- THEN the system SHALL return only orders from that customer
- AND the test SHALL assert that all visible orders contain the searched email
- AND the test SHALL assert the returned count is greater than zero

### Requirement: Product Searches SHALL Have Result Assertions
Tests SHALL assert on the relevance and count of search results.

#### Scenario: Search Products Returns Only Matching Products
- GIVEN the admin products page is displaying a list of products
- WHEN the admin searches for "Picanha"
- THEN all visible products SHALL contain "Picanha" in name or description
- AND the test SHALL assert the returned count is greater than zero
- AND the test SHALL assert the first product name contains the search term

#### Scenario: Search Products with No Results Shows Empty State
- GIVEN the admin products page is displaying a list of products
- WHEN the admin searches for a non-existent product name
- THEN the system SHALL display an empty state message
- AND the product list count SHALL be zero

### Requirement: Category Searches SHALL Have Result Assertions
Tests SHALL assert on the count and relevance of category search results.

#### Scenario: Search Categories Returns Matching Results
- GIVEN the admin categories page is displaying a list of categories
- WHEN the admin searches for a category by name
- THEN all visible categories SHALL match the search query
- AND the test SHALL assert the count of returned categories

#### Scenario: Filter Products By Category Shows Only That Category
- GIVEN the admin products page is displaying a list of products
- WHEN the admin filters by category "Bebidas"
- THEN all visible products SHALL belong to the "Bebidas" category
- AND the test SHALL assert the count of filtered products matches expected
- AND the test SHALL assert the category filter is reflected in the UI

### Requirement: No Conditional Assertions Without Data Setup
Tests SHALL NOT use conditional logic to skip assertions when data is absent; instead, seed data SHALL ensure assertions always execute.

#### Scenario: All Filter Tests Have Unconditional Assertions
- GIVEN a filter test is executed
- WHEN the filter operation completes
- THEN the test SHALL always execute assertions on the result count
- AND the test SHALL NOT contain `if (count > 0)` guards around assertions
- AND the seed data SHALL be verified to contain enough data for all filter scenarios

#### Scenario: All Search Tests Have Unconditional Assertions
- GIVEN a search test is executed
- WHEN the search operation completes
- THEN the test SHALL always execute assertions on the result
- AND the test SHALL NOT skip verification when results are empty
- AND the test SHALL verify empty state is displayed when applicable

---

## MODIFIED Requirements

### Requirement: Admin Orders Filter Tests
Filter tests in the admin orders spec SHALL include result verification.

#### Scenario: Filter Orders by Status Has Result Count Check (Modified)
- GIVEN the admin orders page is displaying a list of orders
- WHEN `filterByStatus('pending')` is called
- THEN the test SHALL assert that the visible order count is greater than zero
- AND the test SHALL assert that each visible order has status "pending"

---

## REMOVED Requirements

None.
