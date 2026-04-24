# Spec for E2E Tests Domain

## ADDED Requirements

### Requirement: Mock Payment Handler Setup
The E2E test suite SHALL provide mock handlers that intercept payment API calls and return deterministic mock data.

#### Scenario: Mock PIX QR Code Endpoint
- GIVEN the E2E test suite is running with mock payment handlers active
- WHEN a request is made to `/api/stripe/create-pix-qrcode`
- THEN the mock handler SHALL intercept the request
- AND SHALL return a mock QR code string matching the BR Code format
- AND SHALL return an `expires_at` field set to 1 hour from the current time

#### Scenario: Mock Payment Intent Endpoint
- GIVEN the E2E test suite is running with mock payment handlers active
- WHEN a request is made to `/api/stripe/create-payment-intent`
- THEN the mock handler SHALL intercept the request
- AND SHALL return a mock `clientSecret` string prefixed with `demo_secret_`
- AND SHALL return HTTP status 200

#### Scenario: Mock Webhook Endpoint
- GIVEN the E2E test suite is running with mock payment handlers active
- WHEN a request is made to `/api/stripe/webhook`
- THEN the mock handler SHALL return HTTP status 200 immediately
- AND SHALL simulate payment confirmation within 2 seconds via internal event dispatch

#### Scenario: Non-Payment Requests Pass Through
- GIVEN the E2E test suite is running with mock payment handlers active
- WHEN a request is made to any endpoint not related to payment
- THEN the mock handler SHALL pass the request to the actual server
- AND the response SHALL be returned without modification

### Requirement: Global Mock Setup
The E2E test suite SHALL apply mock handlers globally before any test runs.

#### Scenario: Mocks Applied Before All Tests
- GIVEN the global setup file `tests/e2e/support/setup.ts` is configured
- WHEN the Playwright test runner initializes
- THEN the mock payment handlers SHALL be registered before any test executes
- AND all tests SHALL use the mock handlers without individual setup

#### Scenario: Mocks Do Not Leak to Other Test Files
- GIVEN mock payment handlers are registered for a test file
- WHEN the test file completes
- THEN subsequent test files SHALL NOT be affected by previous mock configurations
- AND each test file SHALL have a clean mock state

### Requirement: Demo Payment Mode Environment
The E2E test environment SHALL have demo payment mode enabled by default.

#### Scenario: Env File Configuration
- GIVEN the file `.env.e2e` exists in the project root
- WHEN the E2E tests start
- THEN the environment variable `NEXT_PUBLIC_DEMO_PAYMENT_MODE` SHALL be set to `true`
- AND the Stripe API calls SHALL be bypassed in favor of mock responses

### Requirement: E2E Test Data-Testids
The checkout components SHALL have data-testid attributes for reliable E2E element selection.

#### Scenario: Checkout Form Data-Testids
- GIVEN the checkout form component is rendered
- WHEN the E2E test needs to interact with form fields
- THEN the email input SHALL have `data-testid="checkout-email"`
- AND the table number input SHALL have `data-testid="checkout-table-number"`
- AND the submit button SHALL have `data-testid="checkout-submit"`

#### Scenario: Payment Method Data-Testids
- GIVEN the checkout payment selection is rendered
- WHEN the E2E test needs to select a payment method
- THEN the Pix option SHALL have `data-testid="payment-method-pix"`
- AND the Credit Card option SHALL have `data-testid="payment-method-card"`

#### Scenario: Payment Display Data-Testids
- GIVEN the checkout displays payment information
- WHEN the E2E test needs to verify payment content
- THEN the Pix QR code container SHALL have `data-testid="pix-qr-code"`
- AND the Credit Card form container SHALL have `data-testid="card-form"`

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
