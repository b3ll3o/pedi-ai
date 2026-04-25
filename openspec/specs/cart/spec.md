# Spec for Cart Domain

## ADDED Requirements

### Requirement: Cart Operations
The system SHALL allow customers to add, update, remove, and view items in their shopping cart.

#### Scenario: Add Product to Cart
- GIVEN the customer is viewing a product detail
- WHEN the customer selects modifiers (if any) and clicks "Add to Cart"
- THEN the system SHALL add the product with selected modifiers to the cart
- AND the system SHALL persist the cart to IndexedDB
- AND the cart badge SHALL update to reflect the new item count

#### Scenario: Add Product with Required Modifiers
- GIVEN the customer is viewing a product with required modifier groups
- WHEN the customer attempts to add the product without selecting required modifiers
- THEN the system SHALL display an error message indicating required selections
- AND the system SHALL NOT add the product to the cart

#### Scenario: Update Item Quantity
- GIVEN the customer has items in the cart
- WHEN the customer adjusts the quantity of an item
- THEN the system SHALL update the item quantity
- AND the system SHALL recalculate the item subtotal
- AND the system SHALL update the cart total
- AND the system SHALL persist the updated cart to IndexedDB

#### Scenario: Remove Item from Cart
- GIVEN the customer has items in the cart
- WHEN the customer removes an item
- THEN the system SHALL remove the item from the cart
- AND the system SHALL update the cart total
- AND the system SHALL persist the updated cart to IndexedDB
- AND the cart badge SHALL update to reflect the new item count

#### Scenario: View Cart Summary
- GIVEN the customer has added items to the cart
- WHEN the customer navigates to the cart view
- THEN the system SHALL display all items with name, selected modifiers, quantity, and line total
- AND the system SHALL display the cart subtotal
- AND the system SHALL display the cart total after any applicable discounts

#### Scenario: Clear Cart After Checkout
- GIVEN the customer has completed checkout and payment
- WHEN the order is confirmed
- THEN the system SHALL clear all items from the cart
- AND the system SHALL clear the IndexedDB cart cache

### Requirement: Cart Validation
The system SHALL validate cart contents before allowing checkout.

#### Scenario: Cart Item Availability
- GIVEN the customer proceeds to checkout
- WHEN the system validates the cart
- THEN the system SHALL verify each product is still active and available
- AND if a product is unavailable, the system SHALL display which items are no longer available
- AND the system SHALL allow the customer to remove unavailable items and proceed

#### Scenario: Cart Price Consistency
- GIVEN the customer proceeds to checkout
- WHEN the system validates the cart
- THEN the system SHALL verify prices match the current menu prices
- AND if a price has changed, the system SHALL update the cart to reflect the new price
- AND the system SHALL display a notice to the customer about the price change

### Requirement: Combo Items in Cart
The system SHALL support adding combo meals to the cart with their bundled pricing.

#### Scenario: Add Combo to Cart
- GIVEN the customer is viewing a combo detail
- WHEN the customer selects any customizable options and clicks "Add to Cart"
- THEN the system SHALL add the combo with bundle pricing to the cart
- AND the combo SHALL be represented as a single line item with the bundle price

### Requirement: Cart Page Color Consistency
The cart page MUST use the official color palette defined in the design system.

#### Scenario: Cart Item List Colors
- GIVEN the customer views the cart item list
- WHEN items are rendered
- THEN item backgrounds MUST use `--color-surface`
- AND item borders MUST use `--color-border`
- AND product names MUST use `--color-text-primary`
- AND prices MUST use `--color-primary`
- AND modifier text MUST use `--color-text-secondary`

#### Scenario: Cart Summary Colors
- GIVEN the customer views the cart summary section
- WHEN the summary is rendered
- THEN subtotal, taxes, and total labels MUST use `--color-text-secondary`
- AND total amount MUST use `--color-primary` and be visually prominent
- AND the checkout button MUST use `--color-primary` or `--gradient-primary`

#### Scenario: Quantity Stepper Colors
- GIVEN the customer adjusts item quantity using the stepper
- WHEN the stepper buttons are rendered
- THEN button backgrounds MUST use `--color-surface-elevated`
- AND button borders MUST use `--color-border`
- AND button hover MUST use `--color-primary-light`
- AND disabled state MUST use `--color-text-secondary` with reduced opacity

#### Scenario: Remove Item Button Colors
- GIVEN the customer hovers over the remove item button
- WHEN the button is rendered
- THEN the remove icon MUST use `--color-error` on hover
- AND the button background MUST be transparent

#### Scenario: Empty Cart Colors
- GIVEN the customer has no items in the cart
- WHEN the empty cart message is displayed
- THEN the message text MUST use `--color-text-secondary`
- AND any icon MUST use `--color-border`
- AND the "Browse Menu" CTA MUST use `--color-primary`

#### Scenario: Cart Dark Mode
- GIVEN the customer has enabled dark mode
- WHEN the cart page is rendered
- THEN all surfaces MUST use dark theme variants
- AND text MUST maintain proper contrast
- AND the primary checkout button MUST remain visually prominent

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.