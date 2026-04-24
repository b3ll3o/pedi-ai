# Delta for Payment Domain

## ADDED Requirements

### Requirement: Demo Payment Mode
The system SHALL support a demo payment mode that provides mock payment data without requiring external payment provider integration.

#### Scenario: Demo Mode PIX Payment
- GIVEN the environment variable `NEXT_PUBLIC_DEMO_PAYMENT_MODE` is set to `true`
- WHEN the customer selects Pix as the payment method and confirms the order
- THEN the system SHALL return mock Pix QR code data instead of calling the external Stripe API
- AND the mock data SHALL include a valid-looking QR code string
- AND the mock data SHALL include an `expires_at` timestamp 1 hour in the future

#### Scenario: Demo Mode Credit Card Payment
- GIVEN the environment variable `NEXT_PUBLIC_DEMO_PAYMENT_MODE` is set to `true`
- WHEN the customer selects Credit Card as the payment method and confirms the order
- THEN the system SHALL return a mock PaymentIntent client secret instead of calling the external Stripe API
- AND the mock client secret SHALL begin with `demo_secret_`

#### Scenario: Demo Mode Webhook Simulation
- GIVEN the environment variable `NEXT_PUBLIC_DEMO_PAYMENT_MODE` is set to `true`
- WHEN a Pix or Credit Card payment is initiated
- THEN the system SHALL automatically simulate payment confirmation after a 2-second delay
- AND the order status SHALL be updated to `paid` without requiring actual webhook delivery

### Requirement: Mock Data Transparency
The system SHALL ensure demo mode is transparent and does not alter production payment behavior.

#### Scenario: Demo Mode Does Not Affect Real Payments
- GIVEN the environment variable `NEXT_PUBLIC_DEMO_PAYMENT_MODE` is not set or is set to `false`
- WHEN the customer initiates a payment
- THEN the system SHALL call the real Stripe API endpoints
- AND no mock data SHALL be returned

#### Scenario: Demo Mode Feature Flag Only
- GIVEN the demo payment mode is active
- WHEN the payment flow completes
- THEN the application code SHALL NOT contain payment-provider-specific logic branches
- AND the mock behavior SHALL be isolated to environment variable checks only

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
