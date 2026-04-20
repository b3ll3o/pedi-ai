# Spec for Table Domain

## ADDED Requirements

### Requirement: Table QR Code Generation
The system SHALL generate unique QR codes for each table.

#### Scenario: Generate Table QR Code
- GIVEN an admin has created a new table
- WHEN the table is saved
- THEN the system SHALL generate a QR code containing the table_id and restaurant_id
- AND the QR code payload SHALL be signed to prevent tampering
- AND the QR code SHALL be downloadable as a PNG image

#### Scenario: QR Code Content Structure
- GIVEN a QR code is scanned by a customer
- WHEN the QR code payload is decoded
- THEN the payload SHALL contain: restaurant_id, table_id, and a signature
- AND the system SHALL validate the signature before processing
- AND if the signature is invalid, the system SHALL reject the table identification

### Requirement: Table Management
The system SHALL provide CRUD operations for table management.

#### Scenario: Create Table
- GIVEN the admin is in the tables management section
- WHEN the admin creates a new table with a label (e.g., "Table 5")
- THEN the system SHALL create the table record
- AND the system SHALL generate a unique QR code for the table
- AND the table SHALL be marked as active by default

#### Scenario: Update Table
- GIVEN an admin is editing an existing table
- WHEN the admin changes the table label
- THEN the system SHALL update the table record
- AND if a new QR code is requested, the system SHALL regenerate it

#### Scenario: Deactivate Table
- GIVEN an admin is editing an existing table
- WHEN the admin sets the table to inactive
- THEN the system SHALL mark the table as inactive
- AND customers scanning the QR code SHALL receive an error indicating the table is unavailable
- AND existing orders on the table SHALL not be affected

#### Scenario: List Active Tables
- GIVEN the admin is in the tables management section
- WHEN the admin views the table list
- THEN the system SHALL display all tables for the restaurant
- AND each table SHALL display its label, QR code status, and active/inactive status
- AND inactive tables SHALL be visually distinguished

### Requirement: Table Identification
The system SHALL identify the restaurant and table from scanned QR codes.

#### Scenario: Customer Scans Table QR Code
- GIVEN a customer scans a valid table QR code
- WHEN the QR code payload is validated
- THEN the system SHALL identify the restaurant and table
- AND the customer SHALL be redirected to the menu for that restaurant
- AND the table context SHALL be stored for the order

#### Scenario: Invalid QR Code
- GIVEN a customer scans a QR code with invalid signature
- WHEN the QR code payload fails validation
- THEN the system SHALL display an error message
- AND the customer SHALL be prompted to scan a valid QR code

#### Scenario: Inactive Table QR Code
- GIVEN a customer scans a QR code for an inactive table
- WHEN the QR code payload is validated
- THEN the system SHALL display a message indicating the table is currently unavailable
- AND the customer SHALL be prompted to contact staff

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
