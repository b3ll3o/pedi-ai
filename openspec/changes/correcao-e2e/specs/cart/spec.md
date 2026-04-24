# Delta for Cart Domain

## ADDED Requirements

### Requirement: Customer Cart Page Data-TestID Selectors
All customer cart page components MUST have `data-testid` attributes for E2E test targeting.

#### Scenario: Cart Items List Has Test IDs
- GIVEN the customer cart page is rendered
- WHEN the page loads
- THEN the cart container MUST have `data-testid="cart-container"`
- AND the cart items list MUST have `data-testid="cart-items-list"`
- AND each cart item MUST have `data-testid="cart-item-{id}"`
- AND each item name MUST have `data-testid="cart-item-name-{id}"`
- AND each item quantity MUST have `data-testid="cart-item-quantity-{id}"`
- AND each item price MUST have `data-testid="cart-item-price-{id}"`

#### Scenario: Cart Quantity Controls Have Test IDs
- GIVEN the customer cart page is rendered
- WHEN the page loads
- THEN the increase quantity button for each item MUST have `data-testid="cart-item-increase-{id}"`
- AND the decrease quantity button for each item MUST have `data-testid="cart-item-decrease-{id}"`
- AND the remove item button for each item MUST have `data-testid="cart-item-remove-{id}"`

#### Scenario: Cart Summary Has Test IDs
- GIVEN the customer cart page is rendered
- WHEN the page loads
- THEN the cart subtotal MUST have `data-testid="cart-subtotal"`
- AND the cart discount (if any) MUST have `data-testid="cart-discount"`
- AND the cart total MUST have `data-testid="cart-total"`
- AND the checkout button MUST have `data-testid="cart-checkout-button"`
- AND the clear cart button MUST have `data-testid="cart-clear-button"`

#### Scenario: Empty Cart Has Test IDs
- GIVEN the customer has an empty cart
- WHEN the cart page is displayed
- THEN the empty cart message MUST have `data-testid="cart-empty-message"`
- AND the browse menu button MUST have `data-testid="cart-browse-menu-button"`

### Requirement: Cart Error Messages in Portuguese
Cart error messages MUST be displayed in Portuguese.

#### Scenario: Product Unavailable Error
- GIVEN a product in the cart becomes unavailable
- WHEN the cart is displayed
- THEN an error message MUST be displayed in Portuguese
- AND the message SHOULD be "Este produto não está mais disponível."

#### Scenario: Price Changed Warning
- GIVEN a product price has changed since added to cart
- WHEN the cart is displayed
- THEN a warning message MUST be displayed in Portuguese
- AND the message SHOULD indicate the price has been updated.

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
