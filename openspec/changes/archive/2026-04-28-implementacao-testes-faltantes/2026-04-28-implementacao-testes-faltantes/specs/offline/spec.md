# Delta for Offline Testing

## ADDED Requirements

### Requirement: BroadcastChannel Unit Tests
The system MUST have unit tests for the cross-tab cart synchronization via BroadcastChannel.

#### Scenario: Unit test for cart broadcast on update
- GIVEN `broadcastCartUpdate()` is called with cart items and timestamp
- WHEN the function is executed
- THEN it SHALL send a message via BroadcastChannel with type `CART_UPDATE`
- AND the message SHALL contain the items array and timestamp

#### Scenario: Unit test for cart update listener
- GIVEN a listener is registered via `onCartBroadcast()`
- WHEN a cart update message is received from another tab
- THEN the callback SHALL be invoked with the new cart items
- AND it SHALL update the local cart state

#### Scenario: Unit test for timestamp anti-echo
- GIVEN a cart update is broadcast
- WHEN the originating tab receives its own broadcast
- THEN the update SHALL be ignored based on timestamp comparison
- AND the cart state SHALL NOT be duplicated

### Requirement: E2E test for cross-tab cart sync
The system MUST have E2E tests for cart synchronization across browser tabs.

#### Scenario: E2E - Cart updates sync across tabs
- GIVEN a customer has the application open in two tabs
- WHEN the customer adds an item to cart in Tab A
- THEN the cart in Tab B SHALL reflect the new item within 100ms
- AND the total SHALL be updated in both tabs

#### Scenario: E2E - Cart removal syncs across tabs
- GIVEN a customer has the application open in two tabs with items in cart
- WHEN the customer removes an item in Tab B
- THEN the cart in Tab A SHALL reflect the removal
- AND the total SHALL be updated in both tabs

### Requirement: Integration test for Service Worker sync
The system MUST have integration tests for the Service Worker background sync.

#### Scenario: Integration test for background sync queue
- GIVEN a POST to `/api/orders` fails due to network offline
- WHEN the request is queued in BackgroundSyncPlugin
- THEN upon network recovery, the request SHALL be replayed
- AND the order SHALL be created on the server

#### Scenario: Integration test for sync retry with exponential backoff
- GIVEN a queued order sync fails on first attempt
- WHEN the system retries the sync
- THEN the retry delay SHALL follow exponential backoff: 1s, 2s, 4s
- AND the retry count SHALL be tracked
