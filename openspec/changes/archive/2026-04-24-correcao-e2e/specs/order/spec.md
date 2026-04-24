# Delta for Order Domain

## ADDED Requirements

### Requirement: Kitchen Display Page Data-TestID Selectors
The kitchen display page MUST have `data-testid` attributes for all interactive elements.

#### Scenario: Kitchen Display Renders
- GIVEN the kitchen display page is rendered
- WHEN the page loads
- THEN the page container MUST have `data-testid="kitchen-display"`
- AND the orders list MUST have `data-testid="kitchen-orders-list"`

#### Scenario: Kitchen Order Card Has Test IDs
- GIVEN the kitchen display shows pending orders
- WHEN an order is displayed
- THEN each order card MUST have `data-testid="kitchen-order-card-{orderId}"`
- AND the table number MUST have `data-testid="kitchen-order-table-{orderId}"`
- AND the order time MUST have `data-testid="kitchen-order-time-{orderId}"`
- AND the order items list MUST have `data-testid="kitchen-order-items-{orderId}"`

#### Scenario: Kitchen Order Actions Have Test IDs
- GIVEN the kitchen staff is viewing an order
- WHEN the order actions are displayed
- THEN the start preparing button MUST have `data-testid="kitchen-preparing-button-{orderId}"`
- AND the ready button MUST have `data-testid="kitchen-ready-button-{orderId}"`

### Requirement: Waiter Pages Data-TestID Selectors
All waiter-facing pages MUST have `data-testid` attributes for E2E test targeting.

#### Scenario: Waiter Dashboard Has Test IDs
- GIVEN the waiter dashboard is rendered
- WHEN the page loads
- THEN the new orders section MUST have `data-testid="waiter-new-orders"`
- AND each new order card MUST have `data-testid="waiter-order-card-{orderId}"`
- AND the accept button for each order MUST have `data-testid="waiter-accept-button-{orderId}"`
- AND the reject button for each order MUST have `data-testid="waiter-reject-button-{orderId}"`

#### Scenario: Waiter Active Orders Has Test IDs
- GIVEN the waiter dashboard is rendered
- WHEN the active orders section loads
- THEN the active orders section MUST have `data-testid="waiter-active-orders"`
- AND each active order MUST have `data-testid="waiter-active-order-{orderId}"`
- AND the delivered button for each order MUST have `data-testid="waiter-delivered-button-{orderId}"`

### Requirement: Customer Order Status Page Data-TestID Selectors
The customer order status page MUST have `data-testid` attributes for E2E test targeting.

#### Scenario: Order Status Page Renders
- GIVEN the customer order status page is rendered
- WHEN the page loads
- THEN the order status container MUST have `data-testid="order-status-container"`
- AND the order number MUST have `data-testid="order-status-number"`
- AND the order status MUST have `data-testid="order-status-current"`
- AND the status timeline MUST have `data-testid="order-status-timeline"`

#### Scenario: Order Status Items Have Test IDs
- GIVEN the customer order status page is rendered
- WHEN the order items are displayed
- THEN the items list MUST have `data-testid="order-status-items"`
- AND each item MUST have `data-testid="order-status-item-{id}"`

### Requirement: Order Error Messages in Portuguese
Order-related error messages MUST be displayed in Portuguese.

#### Scenario: Order Creation Error
- GIVEN an error occurs during order creation
- WHEN the error is displayed
- THEN the message MUST be in Portuguese
- AND the message SHOULD be "Erro ao criar pedido. Tente novamente."

#### Scenario: Order Not Found Error
- GIVEN the customer navigates to a non-existent order
- WHEN the error is displayed
- THEN the message MUST be in Portuguese
- AND the message SHOULD be "Pedido não encontrado."

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
