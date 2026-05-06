# Delta for Realtime Optimization

## ADDED Requirements

### Requirement: Realtime Subscriptions Use Specific Event Types
The system SHALL use specific event types (INSERT, UPDATE, DELETE) instead of wildcard '*' for better performance.

#### Scenario: Pedidos Subscription Uses INSERT and UPDATE
- GIVEN the realtime subscription for orders
- WHEN subscribing to changes
- THEN the subscription SHALL use `event: 'INSERT'` for new orders
- AND `event: 'UPDATE'` for order status changes
- AND NOT use `event: '*'`

#### Scenario: Itens Pedido Subscription Uses Appropriate Events
- GIVEN the realtime subscription for order items
- WHEN subscribing to changes
- THEN the subscription SHALL use `event: 'INSERT'` for new items
- AND `event: 'UPDATE'` for item modifications
- AND `event: 'DELETE'` for removed items
- AND NOT use `event: '*'`

#### Scenario: Mesas Subscription Uses UPDATE Only
- GIVEN the realtime subscription for tables
- WHEN subscribing to changes
- THEN the subscription SHALL use `event: 'UPDATE'` only
- AND NOT use `event: '*'`

#### Scenario: Cardapio Subscription Uses INSERT, UPDATE, DELETE
- GIVEN the realtime subscription for menu data
- WHEN subscribing to changes
- THEN the subscription SHALL use `event: 'INSERT'`, `event: 'UPDATE'`, and `event: 'DELETE'`
- AND NOT use `event: '*'`

### Requirement: Event Filtering Improves Performance
The system SHALL have improved performance due to filtered realtime events.

#### Scenario: Subscription Filters Reduce Unnecessary Callbacks
- GIVEN a filtered subscription (specific event types)
- WHEN an unrelated event occurs on the same table
- THEN the callback SHALL NOT be triggered
- AND network usage SHALL be reduced
