# Delta for Cart Domain

## ADDED Requirements

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