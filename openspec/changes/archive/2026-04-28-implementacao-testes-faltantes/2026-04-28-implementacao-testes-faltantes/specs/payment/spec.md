# Delta for Payment Testing

## ADDED Requirements

### Requirement: Payment Adapter Unit Tests
The system MUST have unit tests for `PixPaymentAdapter` and `StripePaymentAdapter`.

#### Scenario: Unit test for PixPaymentAdapter.criarCobranca
- GIVEN `PixPaymentAdapter.criarCobranca()` exists
- WHEN called with valid amount and order ID
- THEN it SHALL return a charge object with `txid`, `status: 'pending'`, and `qrCode`
- AND it SHALL NOT throw

#### Scenario: Unit test for PixPaymentAdapter.consultarStatus
- GIVEN `PixPaymentAdapter.consultarStatus()` exists
- WHEN called with a valid `txid`
- THEN it SHALL return the current payment status from the provider

#### Scenario: Unit test for StripePaymentAdapter.criarPaymentIntent
- GIVEN `StripePaymentAdapter.criarPaymentIntent()` exists
- WHEN called with valid amount and currency
- THEN it SHALL return a `clientSecret` from Stripe
- AND it SHALL NOT throw

### Requirement: Webhook Processing Unit Tests
The system MUST have unit tests for webhook handling.

#### Scenario: Unit test for webhook signature validation
- GIVEN `ProcessarWebhookUseCase.execute()` is called
- WHEN a webhook with invalid signature is received
- THEN it SHALL throw an error with 401 status
- AND it SHALL NOT process the payment

#### Scenario: Unit test for duplicate webhook idempotency
- GIVEN `ProcessarWebhookUseCase.execute()` is called twice with the same `webhookId`
- WHEN the first call succeeds
- THEN the second call SHALL return success without re-processing
- AND the system SHALL maintain idempotency

### Requirement: Refund Processing Unit Tests
The system MUST have unit tests for refund operations.

#### Scenario: Unit test for IniciarReembolsoUseCase
- GIVEN `IniciarReembolsoUseCase` exists
- WHEN executed with a valid paid order
- THEN it SHALL call the payment provider's refund API
- AND it SHALL update the payment status to `refunded`

### Requirement: E2E test for Pix payment flow
The system MUST have E2E tests covering the complete Pix payment journey.

#### Scenario: E2E - Complete Pix payment
- GIVEN a customer has items in cart and selects Pix payment
- WHEN the order is confirmed
- THEN the system SHALL display the Pix QR code
- AND the system SHALL poll for payment confirmation
- AND upon confirmation, the order status SHALL be updated to `paid`

#### Scenario: E2E - Pix payment timeout
- GIVEN a customer has initiated Pix payment
- WHEN 60 seconds elapse without confirmation
- THEN the system SHALL display a timeout message
- AND the customer SHALL be able to retry or cancel

### Requirement: E2E test for Stripe payment flow
The system MUST have E2E tests covering the complete Stripe payment journey.

#### Scenario: E2E - Complete Stripe payment
- GIVEN a customer has items in cart and selects Credit Card payment
- WHEN the order is confirmed
- THEN the system SHALL display the Stripe card form
- AND upon successful payment, the order status SHALL be updated to `paid`

### Requirement: E2E test for webhook handling
The system MUST have E2E tests for webhook processing.

#### Scenario: E2E - Stripe webhook updates order status
- GIVEN an order is in `pending_payment` status
- WHEN the Stripe webhook is received with `payment_intent.succeeded`
- THEN the order status SHALL be updated to `paid`
