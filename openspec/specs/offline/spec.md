# Spec for Offline Domain

## ADDED Requirements

### Requirement: Service Worker Registration
The system SHALL register a service worker to enable offline functionality.

#### Scenario: Service Worker Activation
- GIVEN the application is loaded for the first time
- WHEN the service worker is registered
- THEN the service worker SHALL be activated and controlling the application
- AND the service worker SHALL cache the application shell for offline access

#### Scenario: Service Worker Update
- GIVEN a new service worker version is available
- WHEN the page is refreshed
- THEN the new service worker SHALL be installed
- AND the new service worker SHALL activate and take control on the next page load

### Requirement: Offline Menu Caching
The system SHALL cache menu data in IndexedDB for offline browsing.

#### Scenario: Initial Menu Cache
- GIVEN the customer is online and opens the menu
- WHEN the menu data is fetched
- THEN the system SHALL store the menu data in IndexedDB
- AND the cache SHALL include categories, products, modifier groups, and modifier values

#### Scenario: Offline Menu Browsing
- GIVEN the customer has previously loaded the menu while online
- WHEN the customer opens the application while offline
- THEN the system SHALL serve the cached menu from IndexedDB
- AND all browsing functionality SHALL work without network connectivity

#### Scenario: Cache Invalidation
- GIVEN the customer is online
- WHEN menu data changes on the server
- THEN the system SHALL update the IndexedDB cache
- AND the cache timestamp SHALL be updated

### Requirement: Offline Cart Persistence
The system SHALL persist cart state to IndexedDB.

#### Scenario: Cart Persistence on Add
- GIVEN the customer adds an item to the cart
- WHEN the item is added
- THEN the system SHALL persist the cart to IndexedDB immediately
- AND the cart SHALL survive page refresh and browser restart

#### Scenario: Cart Restoration on Return
- GIVEN the customer has items in the cart and closes the browser
- WHEN the customer returns to the application
- THEN the system SHALL restore the cart from IndexedDB
- AND the cart SHALL display all previously added items

### Requirement: Offline Order Queue
The system SHALL queue orders when offline and sync when connectivity returns.

#### Scenario: Order Submission While Offline
- GIVEN the customer has a cart and attempts to checkout while offline
- WHEN the customer confirms the order
- THEN the system SHALL display a message indicating the order is queued
- AND the system SHALL store the order in IndexedDB with status `pending_sync`
- AND the system SHALL NOT attempt to create the order on the server

#### Scenario: Background Sync on Reconnect
- GIVEN a queued order exists in IndexedDB
- WHEN the browser detects network connectivity
- THEN the service worker SHALL attempt to sync the queued order
- AND on successful sync, the system SHALL update the order status to `pending_payment`
- AND the system SHALL remove the order from the queue

#### Scenario: Sync Failure Handling
- GIVEN a queued order fails to sync after network recovery
- WHEN the sync attempt fails
- THEN the system SHALL keep the order in the queue
- AND the system SHALL retry sync on the next connectivity event
- AND after 3 consecutive failures, the system SHALL display an error to the customer
- AND the customer SHALL be given the option to retry manually or cancel

### Requirement: Connectivity Status Display
The system SHALL indicate to the user when they are offline.

#### Scenario: Offline Indicator
- GIVEN the customer loses network connectivity
- WHEN the application detects the offline status
- THEN the system SHALL display an offline indicator in the header
- AND the indicator SHALL show "Você está offline" message

#### Scenario: Online Indicator
- GIVEN the customer was offline
- WHEN network connectivity is restored
- THEN the system SHALL remove the offline indicator
- AND the system SHALL display a brief "Conexão restaurada" message
- AND queued orders SHALL begin syncing

### Requirement: Offline Payment Handling
The system SHALL handle payment gracefully when offline.

#### Scenario: Payment Attempt While Offline
- GIVEN the customer attempts to initiate payment while offline
- WHEN the customer selects a payment method and confirms
- THEN the system SHALL display a message indicating payment requires connectivity
- AND the system SHALL allow the order to remain queued until online

#### Scenario: Pix Payment Cancellation Due to Timeout
- GIVEN the customer is waiting for Pix payment confirmation
- WHEN the application goes offline during the wait
- THEN the system SHALL keep the order in `pending_payment` status
- AND the system SHALL continue polling for confirmation if the app is reopened while online
- AND if 60 seconds elapse without confirmation, the order SHALL be marked as `payment_timeout`

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.