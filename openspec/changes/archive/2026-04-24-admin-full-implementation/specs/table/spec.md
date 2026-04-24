# Delta for Table Domain

## ADDED Requirements

### Requirement: Admin Table CRUD API
The system SHALL provide REST API endpoints for admin table management.

#### Scenario: Create Table via API
- GIVEN an admin is creating a new table
- WHEN the admin submits POST /api/admin/tables with label
- THEN the API SHALL validate the label is not empty
- AND the API SHALL create the table with restaurant_id from session
- AND the API SHALL generate a unique QR code for the table
- AND the API SHALL return 201 with the created table including qr_code_url

#### Scenario: List Tables via API
- GIVEN an admin is viewing the tables list
- WHEN the admin calls GET /api/admin/tables
- THEN the API SHALL return all tables for the restaurant
- AND each table SHALL include label, is_active, and qr_code_url
- AND tables SHALL be ordered by label

#### Scenario: Get Single Table via API
- GIVEN an admin is editing a table
- WHEN the admin calls GET /api/admin/tables/[id]
- THEN the API SHALL return the table if owned by the restaurant
- AND the response SHALL include the QR code data

#### Scenario: Update Table via API
- GIVEN an admin is updating a table
- WHEN the admin submits PUT /api/admin/tables/[id] with updated label
- THEN the API SHALL validate ownership
- AND the API SHALL update only the provided fields
- AND if regenerate_qr=true is passed, the API SHALL generate a new QR code

#### Scenario: Deactivate Table via API
- GIVEN an admin is deactivating a table
- WHEN the admin calls DELETE /api/admin/tables/[id]
- THEN the API SHALL set is_active = false
- AND existing orders on the table SHALL not be affected
- AND customers scanning the QR code SHALL receive "table unavailable" message

#### Scenario: Reactivate Table via API
- GIVEN an admin is reactivating an inactive table
- WHEN the admin calls PATCH /api/admin/tables/[id]/reactivate
- THEN the API SHALL set is_active = true
- AND the table QR code SHALL become valid again

### Requirement: Table QR Code Regeneration
The system SHALL support regenerating QR codes for tables.

#### Scenario: Regenerate Table QR Code
- GIVEN an admin wants to invalidate old QR codes for security
- WHEN the admin calls POST /api/admin/tables/[id]/regenerate-qr
- THEN the API SHALL generate a new signed QR code payload
- AND the old QR code SHALL no longer be valid
- AND the API SHALL return the new qr_code_url

### Requirement: Table Availability Check
The system SHALL validate table availability when customers scan QR codes.

#### Scenario: Check Table Availability on Scan
- GIVEN a customer scans a table QR code
- WHEN the system validates the QR payload
- THEN the system SHALL check if the table is_active = true
- AND if false, the system SHALL return an error indicating table unavailable

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.