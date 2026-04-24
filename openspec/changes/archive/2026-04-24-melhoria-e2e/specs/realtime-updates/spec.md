# Delta for Realtime Updates

## ADDED Requirements

### Requirement: Admin Status Update SHALL Trigger Realtime Event
When an admin updates an order status, the system SHALL emit a Supabase Realtime event.

#### Scenario: Admin Updates Order Status to Preparing
- GIVEN an admin is viewing an order in the admin orders list
- WHEN the admin updates the order status to "preparing"
- THEN the system SHALL emit a realtime broadcast event
- AND the event payload SHALL include the order ID and new status
- AND the event timestamp SHALL be recorded

#### Scenario: Admin Updates Order Status to Ready
- GIVEN an admin is viewing an order in the admin orders list
- WHEN the admin updates the order status to "ready"
- THEN the system SHALL emit a realtime broadcast event
- AND the customer viewing that order SHALL receive the update

#### Scenario: Admin Updates Order Status to Delivered
- GIVEN an admin is viewing an order in the admin orders list
- WHEN the admin updates the order status to "delivered"
- THEN the system SHALL emit a realtime broadcast event
- AND the order timeline SHALL reflect the final status

### Requirement: Customer SHALL Receive Realtime Order Status Updates
The customer order tracking page SHALL receive and display status updates via Supabase Realtime without page reload.

#### Scenario: Customer Receives Status Update Without Reload
- GIVEN a customer is viewing an order tracking page for order ID
- WHEN an admin updates the order status
- THEN the customer page SHALL receive the realtime event within 5 seconds
- AND the order status display SHALL update automatically
- AND the status timeline SHALL show the new status entry

#### Scenario: Customer Order Timeline Updates with New Entry
- GIVEN a customer is viewing an order tracking page
- WHEN a new status update is received via realtime
- THEN the status timeline SHALL append the new status entry
- AND the timeline SHALL display timestamp and new status
- AND the main status indicator SHALL reflect the latest status

#### Scenario: Customer Sees Status Change from Pending to Confirmed
- GIVEN a customer has an order with status "pending_payment"
- WHEN the payment is confirmed and admin marks it as "confirmed"
- THEN the customer SHALL see the status change to "confirmado" or "recebido"
- AND the timeline SHALL show the transition

### Requirement: Realtime Fallback SHALL Use Polling When Connection Lost
When the realtime connection is lost, the system SHALL fall back to polling.

#### Scenario: Realtime Connection Lost Triggers Polling Fallback
- GIVEN a customer is viewing an order tracking page with realtime connected
- WHEN the realtime connection is disconnected
- THEN the system SHALL display a connection status indicator
- AND the system SHALL begin polling the order status endpoint every 10 seconds
- AND the page SHALL attempt to reconnect realtime

#### Scenario: Order Status Updates Received via Polling Fallback
- GIVEN a customer has lost realtime connection and is polling
- WHEN a status update occurs
- THEN the polling mechanism SHALL detect the new status on next poll
- AND the UI SHALL update to reflect the new status

### Requirement: Realtime Updates SHALL Not Cause Hydration Errors
Realtime updates SHALL be handled client-side without causing React hydration mismatches.

#### Scenario: Realtime Update Maintains Hydration Integrity
- GIVEN a customer is viewing an order tracking page that has hydrated
- WHEN a realtime status update arrives
- THEN the update SHALL be applied to the client state only
- AND the page SHALL not re-render in a way that causes hydration warnings
- AND the status display SHALL update smoothly

---

## MODIFIED Requirements

### Requirement: Order Status Display
The order status display SHALL update in response to realtime events.

#### Scenario: Status Display Updates on Realtime Event (Modified)
- GIVEN a customer is viewing an order tracking page
- WHEN a realtime event with new status is received
- THEN the status badge SHALL update to show the new status text
- AND the status SHALL match the value from the realtime payload

---

## REMOVED Requirements

None.
