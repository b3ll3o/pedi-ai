# Delta for Menu Domain

## ADDED Requirements

### Requirement: Admin CRUD API Endpoints
The system SHALL provide REST API endpoints for admin management of menu data.

#### Scenario: Create Category via API
- GIVEN an admin is creating a new category
- WHEN the admin submits POST /api/admin/categories with name, description, display_order
- THEN the API SHALL validate the required fields
- AND the API SHALL create the category with restaurant_id from session
- AND the API SHALL return the created category with 201 status

#### Scenario: List Categories via API
- GIVEN an admin is viewing the categories list
- WHEN the admin calls GET /api/admin/categories
- THEN the API SHALL return all categories for the restaurant
- AND categories SHALL be ordered by display_order ascending

#### Scenario: Get Single Category via API
- GIVEN an admin is editing a category
- WHEN the admin calls GET /api/admin/categories/[id]
- THEN the API SHALL return the category if owned by the restaurant
- AND the API SHALL return 404 if not found or not owned

#### Scenario: Update Category via API
- GIVEN an admin is updating a category
- WHEN the admin submits PUT /api/admin/categories/[id] with updated fields
- THEN the API SHALL validate ownership (restaurant_id match)
- AND the API SHALL update only the provided fields
- AND the API SHALL return the updated category

#### Scenario: Delete Category via API (Soft Delete)
- GIVEN an admin is deleting a category
- WHEN the admin calls DELETE /api/admin/categories/[id]
- THEN the API SHALL set is_active = false
- AND products in the category SHALL NOT be deleted
- AND the category SHALL be excluded from customer menu

#### Scenario: Reorder Categories via API
- GIVEN an admin is reordering categories
- WHEN the admin calls PATCH /api/admin/categories/reorder with array of {id, display_order}
- THEN the API SHALL update all display_order values atomically
- AND the API SHALL validate all category IDs belong to the restaurant

#### Scenario: Create Product via API
- GIVEN an admin is creating a new product
- WHEN the admin submits POST /api/admin/products with name, description, price, category_id, image, dietary_labels
- THEN the API SHALL validate required fields
- AND the API SHALL validate category_id belongs to the restaurant
- AND the API SHALL create the product with restaurant_id from session
- AND the API SHALL return 201 with the created product

#### Scenario: Update Product via API
- GIVEN an admin is updating a product
- WHEN the admin submits PUT /api/admin/products/[id] with updated fields
- THEN the API SHALL validate ownership
- AND the API SHALL update only the provided fields
- AND changes SHALL be immediately visible to customers

#### Scenario: Delete Product via API (Soft Delete)
- GIVEN an admin is deleting a product
- WHEN the admin calls DELETE /api/admin/products/[id]
- THEN the API SHALL set is_active = false
- AND existing orders SHALL not be affected
- AND the product SHALL be excluded from customer menu

#### Scenario: Create Modifier Group via API
- GIVEN an admin is creating a modifier group for a product
- WHEN the admin submits POST /api/admin/modifiers with name, product_id, required, min_selections, max_selections
- THEN the API SHALL validate product ownership
- AND the API SHALL create the modifier group

#### Scenario: Add Modifier Value via API
- GIVEN an admin is adding a modifier value to a group
- WHEN the admin submits POST /api/admin/modifiers/[groupId]/values with name, price_adjustment
- THEN the API SHALL validate the group belongs to the restaurant
- AND the API SHALL create the modifier value

#### Scenario: Update Modifier Value via API
- GIVEN an admin is updating a modifier value
- WHEN the admin submits PUT /api/admin/modifiers/values/[id] with updated fields
- THEN the API SHALL validate ownership
- AND the API SHALL update the modifier value

#### Scenario: Delete Modifier Value via API
- GIVEN an admin is deleting a modifier value
- WHEN the admin calls DELETE /api/admin/modifiers/values/[id]
- THEN the API SHALL soft-delete the modifier value

#### Scenario: Create Combo via API
- GIVEN an admin is creating a combo
- WHEN the admin submits POST /api/admin/combos with name, bundle_price, product_ids
- THEN the API SHALL validate all products belong to the restaurant
- AND the API SHALL create the combo with combo_items

#### Scenario: Update Combo via API
- GIVEN an admin is updating a combo
- WHEN the admin submits PUT /api/admin/combos/[id] with updated fields
- THEN the API SHALL validate ownership
- AND the API SHALL update the combo and its items

#### Scenario: Delete Combo via API
- GIVEN an admin is deleting a combo
- WHEN the admin calls DELETE /api/admin/combos/[id]
- THEN the API SHALL soft-delete the combo

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.