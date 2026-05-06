# Delta for Menu (Restaurant-Scoped Loading)

## ADDED Requirements

### Requirement: Menu Loading by RestaurantId
The system SHALL load menu data based on the restaurantId provided in the URL.

#### Scenario: Menu Loads Correct Restaurant Data
- GIVEN a customer navigates to `/restaurantes/{restaurantId}/cardapio`
- WHEN the page loads
- THEN the system SHALL load categories where `restauranteId = restaurantId`
- AND the system SHALL load products where `restauranteId = restaurantId`
- AND the system SHALL load modifier groups where `restauranteId = restaurantId`

#### Scenario: Menu Store Uses RestaurantId from URL
- GIVEN a customer navigates to a restaurant menu page
- WHEN the menu is loaded
- THEN the MenuStore SHALL store the restaurantId
- AND subsequent menu operations SHALL be scoped to that restaurantId

### Requirement: No Hardcoded Restaurant ID
The system SHALL NOT use hardcoded restaurant IDs for menu loading.

#### Scenario: Remove Hardcoded DEMO_RESTAURANT_ID
- GIVEN the customer is on any menu page
- WHEN the system determines which restaurant's menu to load
- THEN the system SHALL use the restaurantId from URL params
- AND the system SHALL NOT use any hardcoded UUID

---

## MODIFIED Requirements

### Requirement: Menu Data Structure (Modified — Restaurant-Scoped)
The system SHALL provide a hierarchical menu structure scoped to a specific restaurant.

#### Scenario: Browse Categories (Modified)
- GIVEN the customer has opened the restaurant menu at `/restaurantes/{restaurantId}/cardapio`
- WHEN the customer navigates to the menu section
- THEN the system SHALL display all active categories for that restaurant in ascending display_order sequence
- AND each category SHALL display its name and description
- AND categories from other restaurants SHALL NOT be displayed

#### Scenario: View Products in Category (Modified)
- GIVEN the customer has selected a category from the menu
- WHEN the system loads the category view
- THEN the system SHALL display all active products belonging to that category AND restaurantId
- AND each product SHALL display its name, price, and thumbnail image
- AND products with dietary labels SHALL display those labels
- AND products from other restaurants SHALL NOT be displayed

---

## REMOVED Requirements

None.