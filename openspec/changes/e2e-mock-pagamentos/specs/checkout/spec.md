# Spec for Checkout Domain

## ADDED Requirements

### Requirement: Checkout Form Submission
The system SHALL allow customers to submit checkout form data including email and table number.

#### Scenario: Valid Checkout Form Submission
- GIVEN the customer has items in the cart
- WHEN the customer enters a valid email address and table number
- AND clicks the submit button
- THEN the system SHALL validate the email format
- AND SHALL validate the table number is a positive integer
- AND SHALL proceed to payment method selection

#### Scenario: Invalid Email Submission
- GIVEN the customer has items in the cart
- WHEN the customer enters an invalid email format
- AND clicks the submit button
- THEN the system SHALL display an error message indicating invalid email
- AND SHALL NOT proceed to payment method selection

#### Scenario: Missing Table Number Submission
- GIVEN the customer has items in the cart
- WHEN the customer enters a valid email but omits the table number
- AND clicks the submit button
- THEN the system SHALL display an error message indicating table number is required
- AND SHALL NOT proceed to payment method selection

### Requirement: Payment Method Selection
The system SHALL allow customers to choose between Pix and Credit Card payment methods.

#### Scenario: Select Pix Payment Method
- GIVEN the customer is at the checkout payment method selection
- WHEN the customer selects the Pix option
- THEN the system SHALL display Pix payment information
- AND SHALL show the QR code container

#### Scenario: Select Credit Card Payment Method
- GIVEN the customer is at the checkout payment method selection
- WHEN the customer selects the Credit Card option
- THEN the system SHALL display the Credit Card form
- AND SHALL show the card input fields

### Requirement: Pix Payment Display
The system SHALL display Pix QR code information when Pix is selected.

#### Scenario: Pix QR Code Display
- GIVEN the customer has selected Pix as payment method
- WHEN the payment intent is created successfully
- THEN the system SHALL display the QR code image or data
- AND SHALL display the Pix expiration time
- AND SHALL display the Pix amount

#### Scenario: Pix Payment Pending State
- GIVEN the customer has submitted Pix payment
- WHEN the QR code is displayed and awaiting payment
- THEN the system SHALL show a pending status indicator
- AND SHALL allow the customer to cancel and return to cart

### Requirement: Credit Card Payment Display
The system SHALL display Credit Card form when Credit Card is selected.

#### Scenario: Credit Card Form Display
- GIVEN the customer has selected Credit Card as payment method
- WHEN the payment intent is created successfully
- THEN the system SHALL display the card input form
- AND SHALL include fields for card number, expiry, and CVV

#### Scenario: Credit Card Processing State
- GIVEN the customer has submitted Credit Card payment
- WHEN the card is being processed
- THEN the system SHALL show a processing indicator
- AND SHALL disable the submit button to prevent duplicate submission

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
