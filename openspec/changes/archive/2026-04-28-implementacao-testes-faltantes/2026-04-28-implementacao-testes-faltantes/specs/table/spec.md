# Delta for Table Testing

## ADDED Requirements

### Requirement: QR Code Redirect Unit Tests
The system MUST have unit tests for the QR code validation and redirect flow.

#### Scenario: Unit test for validateQRCode redirect
- GIVEN `validateQRCode()` is called with a valid table code
- WHEN the table exists and is active
- THEN it SHALL store the table in `tableStore`
- AND it SHALL redirect to `/menu`

#### Scenario: Unit test for invalid QR code handling
- GIVEN `validateQRCode()` is called with an invalid table code
- WHEN the table does not exist or is inactive
- THEN it SHALL throw an error with appropriate message
- AND it SHALL NOT redirect

#### Scenario: Unit test for table not found
- GIVEN `validateQRCode()` is called with a non-existent code
- WHEN the database returns no results
- THEN it SHALL return an error with status `TABLE_NOT_FOUND`
- AND the user SHALL see an error message

### Requirement: E2E test for QR code redirect flow
The system MUST have E2E tests for the complete QR code validation journey.

#### Scenario: E2E - Valid QR code redirects to menu
- GIVEN a customer scans a valid QR code for an active table
- WHEN the validation completes
- THEN the customer SHALL be redirected to `/menu`
- AND the table SHALL be associated with the cart

#### Scenario: E2E - Invalid QR code shows error
- GIVEN a customer scans an invalid or expired QR code
- WHEN the validation fails
- THEN the customer SHALL see an error message
- AND the customer SHALL NOT be redirected to menu
