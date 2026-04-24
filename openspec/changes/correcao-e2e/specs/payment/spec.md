# Delta for Payment Domain

## ADDED Requirements

### Requirement: Checkout Page Data-TestID Selectors
The checkout page MUST have `data-testid` attributes for all interactive elements.

#### Scenario: Checkout Page Renders
- GIVEN the checkout page is rendered
- WHEN the page loads
- THEN the checkout container MUST have `data-testid="checkout-container"`
- AND the cart summary section MUST have `data-testid="checkout-cart-summary"`
- AND the payment method selection MUST have `data-testid="checkout-payment-methods"`

#### Scenario: Payment Method Selection Has Test IDs
- GIVEN the checkout page is rendered
- WHEN the payment methods are displayed
- THEN the Pix option MUST have `data-testid="checkout-pix-option"`
- AND the credit card option MUST have `data-testid="checkout-card-option"`

#### Scenario: Pix Payment Flow Has Test IDs
- GIVEN the customer selects Pix payment
- WHEN the Pix QR code is displayed
- THEN the QR code container MUST have `data-testid="checkout-pix-qrcode"`
- AND the Pix expiration timer MUST have `data-testid="checkout-pix-timer"`
- AND the cancel button MUST have `data-testid="checkout-pix-cancel"`

#### Scenario: Credit Card Form Has Test IDs
- GIVEN the customer selects credit card payment
- WHEN the card form is displayed
- THEN the card number input MUST have `data-testid="checkout-card-number"`
- AND the expiry input MUST have `data-testid="checkout-card-expiry"`
- AND the CVV input MUST have `data-testid="checkout-card-cvv"`
- AND the pay button MUST have `data-testid="checkout-pay-button"`

#### Scenario: Checkout Confirmation Has Test IDs
- GIVEN the payment is successful
- WHEN the confirmation is displayed
- THEN the success message MUST have `data-testid="checkout-success-message"`
- AND the order number MUST have `data-testid="checkout-order-number"`
- AND the continue shopping button MUST have `data-testid="checkout-continue-button"`

### Requirement: Checkout Error Messages in Portuguese
Checkout error messages MUST be displayed in Portuguese.

#### Scenario: Payment Declined Error
- GIVEN a payment is declined
- WHEN the error is displayed
- THEN the message MUST be in Portuguese
- AND the message SHOULD be "Pagamento recusado. Tente novamente ou use outro método."

#### Scenario: Payment Timeout Error
- GIVEN a Pix payment times out
- WHEN the error is displayed
- THEN the message MUST be in Portuguese
- AND the message SHOULD be "Tempo limite excedido. O pagamento não foi confirmado."

#### Scenario: Network Error During Payment
- GIVEN a network error occurs during payment
- WHEN the error is displayed
- THEN the message MUST be in Portuguese
- AND the message SHOULD be "Erro de conexão. Verifique sua internet e tente novamente."

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
