# Delta for Menu Domain

## ADDED Requirements

### Requirement: Menu Page Color Consistency
The menu page MUST use the official color palette defined in the design system.

#### Scenario: Category Navigation Colors
- GIVEN the customer navigates to the menu page
- WHEN the category tabs or navigation is rendered
- THEN active category MUST use `--color-primary` for indication
- AND inactive categories MUST use `--color-text-secondary`
- AND category borders MUST use `--color-border`

#### Scenario: Product Card Colors
- GIVEN the customer views product cards in a category
- WHEN product cards are rendered
- THEN card backgrounds MUST use `--color-surface`
- AND card borders MUST use `--color-border`
- AND product names MUST use `--color-text-primary`
- AND prices MUST use `--color-primary`
- AND descriptions MUST use `--color-text-secondary`

#### Scenario: Product Detail Modal Colors
- GIVEN the customer opens a product detail view
- WHEN the modal or detail section is rendered
- THEN the background MUST use `--color-surface`
- AND section dividers MUST use `--color-border`
- AND the "Add to Cart" button MUST use `--color-primary` or `--gradient-primary`

#### Scenario: Dietary Label Colors
- GIVEN a product has dietary labels (vegan, gluten-free, etc.)
- WHEN labels are displayed
- THEN the labels SHOULD use semantic colors:
  - Vegan: `--color-success`
  - Gluten-free: `--color-warning`
  - Spicy: `--color-accent`

#### Scenario: Menu Dark Mode
- GIVEN the customer has enabled dark mode
- WHEN the menu page is rendered
- THEN all backgrounds MUST use dark theme `--color-surface` variants
- AND text MUST use dark theme `--color-text-primary` and `--color-text-secondary`
- AND borders MUST use dark theme `--color-border`
- AND active category indicators MUST remain visible

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.