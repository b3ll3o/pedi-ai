# Delta for QR Security

## ADDED Requirements

### Requirement: QR Code Includes Nonce for Replay Attack Prevention
The system SHALL include a cryptographic nonce in QR code payloads to prevent replay attacks.

#### Scenario: QR Payload Contains Nonce
- GIVEN a QR code is generated for a table
- WHEN the payload is constructed
- THEN it SHALL contain a `nonce` field generated with `crypto.randomUUID()`
- AND the nonce SHALL be unique per QR code

#### Scenario: QR Payload Contains Expiry
- GIVEN a QR code is generated for a table
- WHEN the payload is constructed
- THEN it SHALL contain an `expiry` timestamp
- AND the expiry SHALL be 4 hours from generation (not 24h)

#### Scenario: QR Validation Rejects Expired Payloads
- GIVEN a QR code with expiry timestamp
- WHEN the QR code is scanned after expiry
- THEN the validation SHALL reject the QR code
- AND display an error indicating the QR code has expired

#### Scenario: QR Validation Requires Valid Nonce
- GIVEN a QR code payload
- WHEN the validation occurs
- THEN the system SHALL verify the nonce is present and valid
- AND QR codes without a valid nonce SHALL be rejected

### Requirement: Backward Compatibility for Existing QR Codes
The system SHALL maintain backward compatibility with existing QR codes during migration.

#### Scenario: Legacy QR Codes Without Nonce Work During Grace Period
- GIVEN a QR code generated before the nonce feature was added
- WHEN the QR code is scanned
- THEN the system SHALL accept it during a grace period
- AND the grace period SHALL be 24 hours from deployment
