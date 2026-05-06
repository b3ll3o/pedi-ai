# Delta for Restaurant (Public Navigation - Delivery)

## ADDED Requirements

### Requirement: Public Restaurant Listing
The system SHALL provide a public page where customers can browse all active restaurants for delivery orders.

#### Scenario: View Restaurant List
- GIVEN a customer navigates to `/restaurantes`
- WHEN the page loads
- THEN the system SHALL display all active restaurants in a grid layout
- AND each restaurant card SHALL display: name, logo, address, and operating hours

#### Scenario: Search Restaurants by Name
- GIVEN a customer is on the `/restaurantes` page
- WHEN the customer enters a search query
- THEN the system SHALL filter restaurants whose names contain the search query (case-insensitive)

#### Scenario: View Restaurant Details
- GIVEN a customer clicks on a restaurant card
- WHEN the system receives the click
- THEN the system SHALL navigate to `/restaurantes/{restaurantId}/cardapio`
- AND the customer SHALL see the restaurant's full menu for delivery

### Requirement: Restaurant Cardapio Page (Delivery)
The system SHALL provide a menu page for each restaurant that loads the correct menu based on the restaurantId.

#### Scenario: Load Menu by RestaurantId
- GIVEN a customer navigates to `/restaurantes/{restaurantId}/cardapio`
- WHEN the page loads
- THEN the system SHALL load only the menu items belonging to that restaurantId
- AND the customer SHALL NOT see menu items from other restaurants

#### Scenario: Restaurant Not Found
- GIVEN a customer navigates to `/restaurantes/{invalidId}/cardapio`
- WHEN the system cannot find the restaurant
- THEN the system SHALL display a 404 error page
- AND the customer SHALL be prompted to browse restaurants

### Requirement: Public Restaurant API
The system SHALL provide a public API to list active restaurants for delivery.

#### Scenario: List Active Restaurants via API
- GIVEN a client calls `GET /api/restaurants`
- WHEN the request is processed
- THEN the system SHALL return only restaurants where `ativo = true`
- AND the response SHALL include: id, nome, logo_url, endereco, telefone, horarios

#### Scenario: Get Restaurant Details via API
- GIVEN a client calls `GET /api/restaurants/{id}`
- WHEN the request is processed
- THEN the system SHALL return the restaurant details if found
- AND if not found, the system SHALL return 404

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.

---

## Future (Salão/Mesa - NOT IN SCOPE)

The following requirements are planned for future implementation (salão/delivery expansion):

- QR Code generation for table identification
- Table validation via QR code scan
- Menu access via `/restaurantes/{id}/cardapio?mesa={tableId}`
- Split bill functionality for table orders
- Waiter call functionality