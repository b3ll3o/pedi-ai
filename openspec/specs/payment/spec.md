# Spec for Payment Domain

## ADDED Requirements

### Requirement: Payment Method Selection
The system SHALL allow customers to select between available payment methods.

#### Scenario: Select Payment Method
- GIVEN the customer is at checkout with a valid cart
- WHEN the customer selects a payment method (Pix or Credit Card)
- THEN the system SHALL record the selected payment method on the order
- AND the system SHALL proceed to payment processing for the selected method

#### Scenario: Pix Payment Flow
- GIVEN the customer has selected Pix as the payment method
- WHEN the order is confirmed
- THEN the system SHALL create a Pix charge via backend endpoint
- AND the system SHALL display the Pix QR code to the customer
- AND the system SHALL start polling for payment confirmation

#### Scenario: Credit Card Payment Flow
- GIVEN the customer has selected Credit Card as the payment method
- WHEN the order is confirmed
- THEN the system SHALL create a Stripe PaymentIntent via backend endpoint
- AND the system SHALL display the Stripe card input form
- AND the system SHALL process the card payment securely via Stripe

### Requirement: Payment Confirmation
The system SHALL confirm payments and update order status accordingly.

#### Scenario: Pix Payment Success
- GIVEN a customer has initiated a Pix payment
- WHEN the Pix webhook confirms the payment
- THEN the system SHALL update the order status to `paid`
- AND the system SHALL emit a realtime event for waiter notification
- AND the customer SHALL be shown the order confirmation screen

#### Scenario: Pix Payment Timeout
- GIVEN a customer has initiated a Pix payment
- WHEN 60 seconds elapse without payment confirmation
- THEN the system SHALL display a timeout message
- AND the customer SHALL be given the option to retry payment or cancel order

#### Scenario: Credit Card Payment Success
- GIVEN a customer has entered card details and submitted
- WHEN Stripe confirms the payment
- THEN the system SHALL update the order status to `paid`
- AND the system SHALL emit a realtime event for waiter notification
- AND the customer SHALL be shown the order confirmation screen

#### Scenario: Credit Card Payment Failure
- GIVEN a customer has entered card details and submitted
- WHEN Stripe declines the card
- THEN the system SHALL update the order status to `payment_failed`
- AND the customer SHALL be shown the error message from Stripe
- AND the customer SHALL be given the option to retry with a different card

### Requirement: Payment Webhook Handling
The system SHALL handle payment provider webhooks securely.

#### Scenario: Duplicate Webhook Handling
- GIVEN a payment webhook is received
- WHEN the webhook is processed
- THEN the system SHALL verify the webhook has not already been processed (idempotency)
- AND if the webhook is a duplicate, the system SHALL return success without re-processing

#### Scenario: Webhook Security Validation
- GIVEN a payment webhook is received
- WHEN the webhook is processed
- THEN the system SHALL validate the webhook signature from the payment provider
- AND if the signature is invalid, the system SHALL reject the webhook with 401

### Requirement: Refund Processing
The system SHALL support order cancellations and refunds.

#### Scenario: Cancel Order Before Preparation
- GIVEN an order has status `received` or `preparing`
- WHEN the admin cancels the order
- THEN the system SHALL initiate a refund via the original payment method
- AND the system SHALL update the order status to `cancelled`
- AND the system SHALL notify the customer of the cancellation

#### Scenario: Refund Confirmation
- GIVEN a refund was initiated
- WHEN the payment provider confirms the refund
- THEN the system SHALL update the order status to `refunded`
- AND the system SHALL notify the customer via email or in-app notification

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.