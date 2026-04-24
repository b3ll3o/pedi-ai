# Delta for Menu Domain

## ADDED Requirements

### Requirement: Customer Menu Page Data-TestID Selectors
All customer menu page components MUST have `data-testid` attributes for E2E test targeting.

#### Scenario: Menu Categories List Has Test IDs
- GIVEN the customer menu page is rendered
- WHEN the page loads
- THEN the categories section MUST have `data-testid="menu-categories"`
- AND each category card MUST have `data-testid="menu-category-card-{id}"`

#### Scenario: Menu Products List Has Test IDs
- GIVEN the customer selects a category
- WHEN the products are displayed
- THEN the products grid MUST have `data-testid="menu-products-grid"`
- AND each product card MUST have `data-testid="menu-product-card-{id}"`
- AND the product name MUST have `data-testid="menu-product-name-{id}"`
- AND the product price MUST have `data-testid="menu-product-price-{id}"`
- AND the add to cart button for each product MUST have `data-testid="menu-add-to-cart-{id}"`

#### Scenario: Menu Product Detail Has Test IDs
- GIVEN the customer selects a product to view details
- WHEN the product detail modal/page is displayed
- THEN the product name MUST have `data-testid="product-detail-name"`
- AND the product description MUST have `data-testid="product-detail-description"`
- AND the product price MUST have `data-testid="product-detail-price"`
- AND the modifier groups MUST have `data-testid="product-detail-modifier-group-{id}"`
- AND each modifier option MUST have `data-testid="product-detail-modifier-{id}"`
- AND the add to cart button MUST have `data-testid="product-detail-add-button"`

#### Scenario: Menu Search Has Test IDs
- GIVEN the customer opens the search functionality
- WHEN the search input is displayed
- THEN the search input MUST have `data-testid="menu-search-input"`
- AND the search results list MUST have `data-testid="menu-search-results"`
- AND each search result MUST have `data-testid="menu-search-result-{id}"`

#### Scenario: Menu Dietary Filter Has Test IDs
- GIVEN the customer opens dietary filter options
- WHEN the filters are displayed
- THEN each filter option MUST have `data-testid="menu-dietary-filter-{label}"`

### Requirement: Menu Error Messages in Portuguese
Menu error messages MUST be displayed in Portuguese.

#### Scenario: Offline Menu Error
- GIVEN the customer is offline and tries to load the menu
- WHEN the system cannot load menu data
- THEN an error message MUST be displayed in Portuguese
- AND the message SHOULD be "Não foi possível carregar o cardápio. Verifique sua conexão."

#### Scenario: Empty Category Message
- GIVEN the customer selects a category with no products
- WHEN the category is displayed
- THEN a message MUST be displayed in Portuguese
- AND the message SHOULD be "Nenhum produto disponível nesta categoria."

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
