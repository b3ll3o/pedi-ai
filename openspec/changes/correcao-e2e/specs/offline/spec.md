# Delta for Offline Domain

## ADDED Requirements

### Requirement: Offline Page Data-TestID Selectors
All offline-related pages and components MUST have `data-testid` attributes for E2E test targeting.

#### Scenario: Offline Indicator Has Test ID
- GIVEN the application detects offline status
- WHEN the offline indicator is displayed
- THEN the offline banner MUST have `data-testid="offline-indicator"`
- AND the banner text MUST indicate offline status in Portuguese

#### Scenario: Online Restored Indicator Has Test ID
- GIVEN the application detects online status restored
- WHEN the indicator is displayed
- THEN the online restored message MUST have `data-testid="online-indicator"`

#### Scenario: Offline Order Queue Has Test IDs
- GIVEN the customer has queued orders while offline
- WHEN the queue is displayed
- THEN the queue container MUST have `data-testid="offline-queue"`
- AND each queued order MUST have `data-testid="offline-queued-order-{id}"`
- AND the sync status MUST have `data-testid="offline-sync-status"`

#### Scenario: Offline Menu Page Has Test IDs
- GIVEN the customer is offline and viewing the menu
- WHEN the cached menu is displayed
- THEN the cached indicator MUST have `data-testid="offline-cached-badge"`
- AND the last sync time MUST have `data-testid="offline-last-sync"`

#### Scenario: Offline Cart Has Test IDs
- GIVEN the customer is offline and viewing the cart
- WHEN the cart is displayed
- THEN the offline cart badge MUST have `data-testid="offline-cart-badge"`
- AND the sync pending indicator MUST have `data-testid="offline-sync-pending"`

### Requirement: Offline Error Messages in Portuguese
Offline-related error messages MUST be displayed in Portuguese.

#### Scenario: Offline Error Message
- GIVEN the customer is offline and an error occurs
- WHEN the error is displayed
- THEN the message MUST be in Portuguese
- AND the message SHOULD be "Você está offline. Algumas funcionalidades podem estar limitadas."

#### Scenario: Sync Failed Error
- GIVEN a sync attempt fails
- WHEN the error is displayed
- THEN the message MUST be in Portuguese
- AND the message SHOULD be "Erro ao sincronizar. Tentando novamente..."

#### Scenario: Sync Success Message
- GIVEN sync completes successfully after being offline
- WHEN the success is displayed
- THEN the message MUST be in Portuguese
- AND the message SHOULD be "Conexão restaurada. Pedidos sincronizados com sucesso."

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
