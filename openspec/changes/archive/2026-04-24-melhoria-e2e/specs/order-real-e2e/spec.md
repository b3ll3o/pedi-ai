# Delta for Order Real E2E

## ADDED Requirements

### Requirement: Order E2E Tests SHALL Use Real Order Data
All E2E tests for the order domain SHALL create orders via API rather than relying on hardcoded order IDs.

#### Scenario: Order Tracking with Real Order ID
- GIVEN the customer has added items to cart and confirmed checkout
- WHEN the system creates a real order via API
- THEN the order page SHALL display the actual order ID returned by the API
- AND the order tracking page SHALL load using that real order ID

#### Scenario: Order Status Timeline with Real Order
- GIVEN a real order has been created and is in `pending_payment` status
- WHEN the customer navigates to the order tracking page
- THEN the system SHALL display the correct status timeline
- AND all status updates SHALL be reflected without page reload

#### Scenario: Order Total Calculation with Real Data
- GIVEN a real order with items, modifiers, and applicable discounts
- WHEN the order tracking page loads
- THEN the displayed total SHALL match the sum of item prices plus modifiers minus discounts

### Requirement: E2E Tests SHALL NOT Use Mock Order IDs
Tests SHALL NOT reference hardcoded strings such as `test-order-123` for order identification.

#### Scenario: Replace Mock Order ID with Real Order Creation
- GIVEN the E2E test needs a valid order for testing
- WHEN the test executes
- THEN the test SHALL call the order creation API to obtain a valid order ID
- AND the test SHALL use that real ID for all subsequent assertions

#### Scenario: Order List Displays Real Orders
- GIVEN an admin user is viewing the orders list
- WHEN orders have been created via real checkout flow
- THEN the admin orders list SHALL display those real orders
- AND filtering by status SHALL return only orders matching the filter criteria

### Requirement: PIX Payment Flow SHALL Use Real Payment Confirmation
Payment E2E tests SHALL validate PIX payment confirmation using actual payment status updates.

#### Scenario: PIX Order Payment Confirmation
- GIVEN a customer has completed checkout with PIX payment method
- WHEN the payment webhook updates the order status to `paid`
- THEN the order tracking page SHALL display payment confirmed status
- AND the order SHALL be eligible for kitchen processing

---

## MODIFIED Requirements

### Requirement: Order Tracking Page
The order tracking page SHALL display accurate, real-time order status.

#### Scenario: Order Tracking Page Loads with Real Order ID (Modified)
- GIVEN a valid real order ID exists in the system
- WHEN the customer navigates to `/order/{realOrderId}`
- THEN the system SHALL display order details including ID, status, items, and total
- AND the system SHALL NOT display placeholder or mock data

---

## REMOVED Requirements

### Requirement: Mock Order ID Usage
The use of hardcoded mock order IDs such as `test-order-123` in E2E tests is REMOVED.
