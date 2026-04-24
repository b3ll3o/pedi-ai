# Modifier Groups — Product Options and Customization

## Overview

Modifier groups allow products to have customizable options (e.g., size, extras, toppings) that affect price and are required/optional at the customer's discretion.

##ADDED Requirements

### Requirement: Cart SHALL Validate Mandatory Modifier Selection
The system SHALL prevent adding items with mandatory modifier groups to cart unless at least one modifier is selected.

#### Scenario: Add Item with Mandatory Modifier Group — No Selection Blocked
- GIVEN a product exists with a mandatory modifier group (e.g., "Tamanho" with required=true)
- WHEN the customer attempts to add the item to cart without selecting a modifier
- THEN the system SHALL display a validation error message
- AND the item SHALL NOT be added to the cart
- AND the add-to-cart button SHALL remain disabled or show an error state

#### Scenario: Add Item with Mandatory Modifier Group — Valid Selection
- GIVEN a product exists with a mandatory modifier group
- WHEN the customer selects at least one modifier from the group
- THEN the system SHALL enable the add-to-cart button
- AND the item SHALL be added to cart with the selected modifier
- AND the cart total SHALL reflect the modifier price adjustment

### Requirement: Cart SHALL Accept Items with Optional Modifier Groups
The system SHALL allow adding items with optional modifier groups without requiring selection.

#### Scenario: Add Item with Optional Modifier Group — No Selection Allowed
- GIVEN a product exists with an optional modifier group (e.g., "Extras" with required=false)
- WHEN the customer adds the item to cart without selecting any modifier
- THEN the system SHALL add the item to cart successfully
- AND the item price SHALL be the base price without modifier adjustments

#### Scenario: Add Item with Optional Modifier Group — With Selection
- GIVEN a product exists with an optional modifier group
- WHEN the customer selects one or more modifiers and adds to cart
- THEN the system SHALL add the item with selected modifiers
- AND the cart total SHALL include modifier price adjustments

### Requirement: Cart SHALL Display Modifier Selections Correctly
The cart page SHALL display all selected modifiers for each item.

#### Scenario: Cart Item Shows Selected Modifiers
- GIVEN an item with modifiers has been added to cart
- WHEN the customer views the cart page
- THEN each cart item SHALL display its selected modifiers
- AND the modifier prices SHALL be itemized in the item breakdown

#### Scenario: Cart Total Reflects Modifier Price Adjustments
- GIVEN a cart contains items with modifiers
- WHEN the cart total is calculated
- THEN the total SHALL equal the sum of (base item prices + modifier price adjustments)

### Requirement: Checkout SHALL Validate Modifier Groups Before Payment
The system SHALL validate all cart items have required modifiers before allowing payment.

#### Scenario: Checkout Blocked for Missing Mandatory Modifiers
- GIVEN a cart contains an item with mandatory modifiers that were deselected after adding
- WHEN the customer attempts to proceed to checkout
- THEN the system SHALL display an error indicating missing required selections
- AND the checkout SHALL be blocked until corrections are made

## MODIFIED Requirements

### Requirement: Add to Cart Flow
The add-to-cart flow SHALL support modifier group selection UI and validation.

#### Scenario: Add to Cart Opens Modifier Selection Modal (Modified)
- GIVEN a product has modifier groups defined
- WHEN the customer clicks the add-to-cart button
- THEN the system SHALL display a modal or inline panel with modifier group options
- AND mandatory groups SHALL be visually marked as required

---

## Metadata

| Field | Value |
|-------|-------|
| Domain | modifier-groups |
| Installed | 2026-04-24 (from change 2026-04-24-melhoria-e2e) |
| Status | active |
