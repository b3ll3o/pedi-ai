# Delta for Order Domain

## ADDED Requirements

### Requirement: Admin Order List API
The system SHALL provide API endpoints for admin order management.

#### Scenario: List Orders with Status Filter
- GIVEN an admin is viewing the orders list
- WHEN the admin calls GET /api/admin/orders?status=preparing
- THEN the API SHALL return all orders with status "preparing" for the restaurant
- AND the response SHALL include order summary (id, status, created_at, table_id, total)

#### Scenario: List Orders with Date Range Filter
- GIVEN an admin is viewing the orders list
- WHEN the admin calls GET /api/admin/orders?start_date=2024-01-01&end_date=2024-01-31
- THEN the API SHALL return orders created within the date range
- AND the date range SHALL be inclusive

#### Scenario: List Orders with Combined Filters
- GIVEN an admin is viewing the orders list
- WHEN the admin calls GET /api/admin/orders?status=delivered&start_date=2024-01-01
- THEN the API SHALL return orders matching BOTH conditions
- AND results SHALL be paginated with default limit of 50

#### Scenario: Pagination of Orders
- GIVEN an admin is viewing the orders list
- WHEN the admin calls GET /api/admin/orders?page=2&limit=20
- THEN the API SHALL return orders 21-40
- AND the response SHALL include pagination metadata (total, page, limit)

### Requirement: Admin Order Detail API
The system SHALL provide API endpoint for viewing order details.

#### Scenario: Get Order Details
- GIVEN an admin is viewing order details
- WHEN the admin calls GET /api/admin/orders/[id]
- THEN the API SHALL return the full order including:
  - All order_items with product name, quantity, unit_price, modifiers
  - Status history (order_status_history) with timestamps and actor
  - Customer information (if logged in customer)
  - Table information
  - Payment information

#### Scenario: Order Not Found
- GIVEN an admin requests an order that doesn't exist
- WHEN the admin calls GET /api/admin/orders/invalid-id
- THEN the API SHALL return 404 Not Found

#### Scenario: Order from Different Restaurant
- GIVEN an admin requests an order that belongs to another restaurant
- WHEN the admin calls GET /api/admin/orders/[id] where order.restaurant_id != session.restaurant_id
- THEN the API SHALL return 404 Not Found (not 403 to prevent enumeration)

### Requirement: Admin Order Status Update API
The system SHALL provide API endpoint for updating order status.

#### Scenario: Update Order Status
- GIVEN an admin is viewing order details
- WHEN the admin calls PATCH /api/admin/orders/[id]/status with new_status
- THEN the API SHALL validate the status transition is allowed
- AND the API SHALL create an entry in order_status_history
- AND the API SHALL emit a realtime event for the update
- AND the API SHALL return the updated order

#### Scenario: Invalid Status Transition
- GIVEN an admin attempts to update order status
- WHEN the admin calls PATCH /api/admin/orders/[id]/status with invalid transition (e.g., delivered -> preparing)
- THEN the API SHALL return 400 Bad Request
- AND the API SHALL specify the allowed transitions

#### Scenario: Order Status Update Records Actor
- GIVEN an admin updates an order status
- WHEN the PATCH /api/admin/orders/[id]/status is called
- THEN the order_status_history entry SHALL include the admin user ID
- AND the timestamp SHALL be recorded

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.