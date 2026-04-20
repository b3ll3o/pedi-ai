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

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
