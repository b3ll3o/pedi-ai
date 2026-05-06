# Delta for Table (Future - Salão)

> **NOTA:** Esta especificação está marcada como **FUTURO** - não faz parte do scope atual de delivery.

## Future Requirements (NOT IMPLEMENTED)

### Requirement: QR Code for Table Identification (Future)
The system SHALL generate unique QR codes for each table to identify customers in the dining area.

#### Scenario: Generate Table QR Code (Future)
- GIVEN an admin has created a new table
- WHEN the table is saved
- THEN the system SHALL generate a QR code containing the table_id and restaurant_id
- AND the QR code payload SHALL be signed to prevent tampering

#### Scenario: Customer Scans Table QR Code (Future)
- GIVEN a customer scans a valid table QR code
- WHEN the QR code payload is validated
- THEN the system SHALL identify the restaurant and table
- AND the customer SHALL be redirected to the menu for that restaurant with table context
- AND the table context SHALL be stored for the order

---

## Current Implementation (Delivery)

The current implementation does NOT include table/QR code functionality. The delivery flow works as follows:

1. Customer accesses `/restaurantes` and selects a restaurant
2. Customer browses the menu at `/restaurantes/{id}/cardapio`
3. Customer adds items to cart and completes checkout
4. Order is marked as delivery (no table association)

---

## Planned Changes for Salão (Future)

When the salão (dine-in) feature is implemented, the following changes will be needed:

1. **QR Code Generator Update** (`src/lib/qr/generator.ts`):
   - Generate URL format: `/restaurantes/{restaurantId}/cardapio?mesa={tableId}`
   - Maintain encrypted payload for security

2. **Table Validation** (`src/app/table/[code]/page.tsx`):
   - Validate QR code payload
   - Redirect to new URL format with table context

3. **Table Store Enhancement** (`src/stores/tableStore.ts`):
   - Already exists with restaurantId, tableId, tableName
   - Will be populated when QR code is scanned

4. **Cart Enhancement**:
   - Add tableId to order for dine-in orders
   - Differentiate between delivery and dine-in orders

---

## OUT OF SCOPE (Delivery Phase)

- QR Code generation for tables
- Table validation via QR scan
- `/table/[code]` route
- Mesa/salão functionality