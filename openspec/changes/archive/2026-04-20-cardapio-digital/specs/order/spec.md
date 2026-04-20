# Spec for Order Domain

## ADDED Requirements

### Requirement: Order Creation
The system SHALL allow customers to create orders from their cart contents.

#### Scenario: Create Order from Cart
- GIVEN the customer has a cart with items and has selected a payment method
- WHEN the customer confirms the order
- THEN the system SHALL create an order record with status `pending_payment`
- AND the order SHALL contain all cart items as order_items
- AND the order SHALL reference the table_id from the QR code scan
- AND the order SHALL reference the restaurant_id from the QR code scan
- AND the order SHALL record the total amount

#### Scenario: Order Passed to Kitchen
- GIVEN an order has been created and payment has been confirmed
- WHEN the payment webhook updates the order status to `paid`
- THEN the system SHALL update the order status to `received`
- AND the system SHALL emit a realtime event for waiter notification

#### Scenario: Order Status Update by Waiter
- GIVEN a waiter has received a new order notification
- WHEN the waiter accepts the order
- THEN the system SHALL update the order status to `preparing`
- AND the system SHALL record the status change in order_status_history with the waiter's ID

#### Scenario: Order Status Rejection
- GIVEN a waiter has received a new order notification
- WHEN the waiter rejects the order with a reason
- THEN the system SHALL update the order status to `rejected`
- AND the system SHALL record the rejection reason
- AND the system SHALL notify the customer of the rejection

#### Scenario: Order Ready for Delivery
- GIVEN an order is being prepared
- WHEN the kitchen marks the order as ready
- THEN the system SHALL update the order status to `ready`
- AND the system SHALL emit a realtime event for waiter notification

#### Scenario: Order Delivered
- GIVEN an order is ready for delivery
- WHEN the waiter marks the order as delivered
- THEN the system SHALL update the order status to `delivered`
- AND the system SHALL record the delivery timestamp

### Requirement: Order History
The system SHALL provide customers access to their order history.

#### Scenario: View Order History
- GIVEN the customer has completed orders
- WHEN the customer navigates to order history
- THEN the system SHALL display all orders for the customer's account
- AND each order SHALL display order date, status, items summary, and total
- AND orders SHALL be sorted by date descending

#### Scenario: View Order Detail
- GIVEN the customer has selected an order from history
- WHEN the system loads the order detail view
- THEN the system SHALL display all order items with modifiers and prices
- AND the system SHALL display the order status history with timestamps
- AND the system SHALL display payment information

#### Scenario: Reorder from History
- GIVEN the customer is viewing a past order
- WHEN the customer clicks "Reorder"
- THEN the system SHALL add all items from that order to the current cart
- AND the customer SHALL be navigated to the cart view

### Requirement: Kitchen Display
The system SHALL provide a kitchen display view for pending orders.

#### Scenario: Kitchen Display Shows Pending Orders
- GIVEN the kitchen staff has access to the kitchen display
- WHEN the kitchen display loads
- THEN the system SHALL display all orders with status `received` or `preparing`
- AND orders SHALL be sorted by creation time (oldest first)
- AND each order SHALL display table number, items, modifiers, and elapsed time

#### Scenario: Kitchen Updates Order Status
- GIVEN the kitchen staff is viewing an order on the kitchen display
- WHEN the kitchen staff marks the order as ready
- THEN the system SHALL update the order status to `ready`
- AND the kitchen display SHALL remove the order from the active list

### Requirement: Waiter Order Notifications
The system SHALL provide real-time notifications to waiters for new orders.

#### Scenario: Waiter Receives New Order Alert
- GIVEN a waiter is logged in and connected to realtime
- WHEN a new order is placed and paid
- THEN the waiter SHALL receive a notification within 5 seconds
- AND the notification SHALL include table number and order total
- AND the waiter dashboard SHALL update to show the new order

#### Scenario: Waiter Connection Loss Fallback
- GIVEN a waiter has an active session but realtime connection is lost
- WHEN the connection is lost
- THEN the system SHALL fall back to polling every 10 seconds
- AND the system SHALL display a connection status indicator

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
