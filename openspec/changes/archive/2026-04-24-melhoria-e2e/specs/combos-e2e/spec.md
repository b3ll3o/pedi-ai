# Delta for Combos E2E

## ADDED Requirements

### Requirement: Admin SHALL Be Able to Create Combos with Bundle Price
The admin interface SHALL allow creating combo products with bundled items and a special bundle price.

#### Scenario: Admin Creates Combo Product
- GIVEN an admin user is on the products management page
- WHEN the admin clicks "Adicionar Combo" or selects combo product type
- THEN the system SHALL display a combo creation form
- AND the form SHALL include fields for name, description, bundle price, and bundled items
- AND the admin SHALL be able to select multiple products to include in the combo

#### Scenario: Admin Sets Bundle Price Lower Than Sum of Items
- GIVEN an admin is creating a combo
- WHEN the admin sets a bundle price that is lower than the sum of individual item prices
- THEN the system SHALL accept the bundle price
- AND the combo SHALL be created with a discount indicator

#### Scenario: Admin Associates Combo with Category
- GIVEN an admin is creating a combo
- WHEN the admin selects a category for the combo
- THEN the combo SHALL appear in the menu under the selected category

### Requirement: Customer SHALL Be Able to Add Combos to Cart
The customer interface SHALL allow adding combo products to cart.

#### Scenario: Customer Adds Combo to Cart from Menu
- GIVEN a combo product is available in the menu
- WHEN the customer clicks "Adicionar" on the combo
- THEN the system SHALL add the combo to cart
- AND the cart SHALL display the combo with its bundled items
- AND the combo price SHALL be the bundle price, not the sum of items

#### Scenario: Combo Price Displayed as Bundle Price
- GIVEN a customer is viewing the menu
- WHEN a combo product is displayed
- THEN the displayed price SHALL be the bundle price
- AND the menu SHALL indicate the savings compared to buying items separately

### Requirement: Cart SHALL Calculate Combo Bundle Price Correctly
The cart calculation SHALL apply the bundle price for combos, not the sum of individual item prices.

#### Scenario: Cart Total Uses Bundle Price for Combo Items
- GIVEN a cart contains a combo product with bundle price
- WHEN the cart total is calculated
- THEN the combo item SHALL contribute the bundle price to the total
- AND the total SHALL NOT be the sum of individual item prices within the combo

#### Scenario: Combo with Modifiers Applied to Bundled Items
- GIVEN a combo contains items that have modifier groups
- WHEN the customer adds the combo to cart and customizes modifiers on bundled items
- THEN the modifier price adjustments SHALL be added to the bundle price
- AND the cart total SHALL reflect base bundle price plus modifier adjustments

### Requirement: Combo Products SHALL Appear in Order Details
Order details SHALL clearly display combo products and their bundled components.

#### Scenario: Order Details Show Combo Components
- GIVEN an order contains a combo product
- WHEN the order details are displayed (admin or customer)
- THEN the system SHALL show the combo as a single line item with bundle price
- AND the system SHALL optionally expand to show bundled items

---

## MODIFIED Requirements

### Requirement: Product Type Support
The system SHALL support a "combo" product type alongside regular products.

#### Scenario: Combo Product Type in Menu Display (Modified)
- GIVEN a combo product exists in the system
- WHEN the menu is rendered for customers
- THEN the combo SHALL be displayed with a "Combo" badge or indicator
- AND the combo SHALL display the bundle price prominently

---

## REMOVED Requirements

None.
