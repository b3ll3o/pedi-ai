# Delta for Cart (Restaurant Isolation)

## ADDED Requirements

### Requirement: Cart Isolation by Restaurant
The system SHALL isolate cart data by restaurantId to prevent mixing items from different restaurants.

#### Scenario: Cart Belongs to Specific Restaurant
- GIVEN a customer has items in the cart for Restaurant A
- WHEN the customer navigates to Restaurant B's menu
- THEN the system SHALL display an empty cart for Restaurant B
- AND the cart SHALL only contain items from the current restaurant

#### Scenario: Clear Cart on Restaurant Change
- GIVEN a customer is on Restaurant A's menu with items in cart
- WHEN the customer navigates to Restaurant B's menu
- THEN the system SHALL clear the cart before switching
- AND the customer SHALL start with an empty cart for Restaurant B

#### Scenario: Add Item to Cart Associates RestaurantId
- GIVEN a customer adds an item to the cart
- WHEN the item is added
- THEN the system SHALL associate the item with the current restaurantId
- AND the cart SHALL only accept items from that restaurant

### Requirement: Cart Persisted Per Restaurant
The system SHALL persist cart data separately for each restaurant in IndexedDB.

#### Scenario: Cart Persistence Per Restaurant
- GIVEN a customer has items in the cart for Restaurant A
- WHEN the customer closes the browser and returns
- THEN the system SHALL restore the cart for Restaurant A if the customer returns to Restaurant A
- AND the system SHALL NOT restore Restaurant A's cart if the customer returns to Restaurant B

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.