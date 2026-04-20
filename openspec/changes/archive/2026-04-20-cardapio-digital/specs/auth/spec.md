# Spec for Auth Domain

## ADDED Requirements

### Requirement: Admin Authentication
The system SHALL authenticate admin users via Supabase Auth.

#### Scenario: Admin Registration
- GIVEN a restaurant owner is setting up the system
- WHEN the owner creates the first admin account
- THEN the system SHALL create the user in Supabase Auth
- AND the system SHALL assign the "owner" role to the account
- AND the restaurant record SHALL be created and associated

#### Scenario: Staff User Creation
- GIVEN an owner or manager is logged in
- WHEN the owner/manager creates a new staff user
- THEN the system SHALL create the user in Supabase Auth
- AND the system SHALL assign the "staff" or "manager" role based on selection
- AND the user SHALL receive an invitation email

#### Scenario: Staff User Login
- GIVEN a staff user receives an invitation email
- WHEN the staff user sets their password and logs in
- THEN the system SHALL create a session for the staff user
- AND the system SHALL enforce role-based permissions

### Requirement: Session Management
The system SHALL manage user sessions securely.

#### Scenario: Session Expiry
- GIVEN an admin user has an active session
- WHEN the session expires (24 hours of inactivity)
- THEN the system SHALL require the user to re-authenticate
- AND the user SHALL be redirected to the login page

#### Scenario: Concurrent Session Handling
- GIVEN an admin user is logged in on one device
- WHEN the same user logs in on another device
- THEN the system SHALL maintain both sessions
- AND each session SHALL have independent expiration

### Requirement: Role Enforcement
The system SHALL enforce role-based access control at both API and UI levels.

#### Scenario: API-level Role Check
- GIVEN an API request is made to a protected endpoint
- WHEN the request includes an invalid or missing role
- THEN the system SHALL return 403 Forbidden
- AND the system SHALL not process the request

#### Scenario: UI-level Role Navigation
- GIVEN a staff user is logged in
- WHEN the staff user attempts to navigate to a manager/owner-only page
- THEN the system SHALL display an access denied message
- AND the user SHALL be redirected to an allowed page

### Requirement: Password Reset
The system SHALL support password reset functionality.

#### Scenario: Password Reset Request
- GIVEN an admin user has forgotten their password
- WHEN the user submits a password reset request
- THEN the system SHALL send a password reset email via Supabase Auth
- AND the user SHALL be able to set a new password via the reset link

#### Scenario: Password Reset Completion
- GIVEN a user has clicked a password reset link
- WHEN the user submits a new password
- THEN the system SHALL update the user's password
- AND the user SHALL be logged in with the new password
- AND previous sessions SHALL be invalidated

### Requirement: Customer Authentication (Optional)
The system MAY allow customers to create accounts for order history.

#### Scenario: Customer Account Creation
- GIVEN a customer chooses to create an account
- WHEN the customer registers with email and password
- THEN the system SHALL create a customer account
- AND the customer SHALL be able to view order history

#### Scenario: Customer Login
- GIVEN a customer has an account
- WHEN the customer logs in
- THEN the system SHALL authenticate the customer
- AND the customer SHALL be able to view their order history

#### Scenario: Guest Checkout
- GIVEN a customer does not want to create an account
- WHEN the customer proceeds to checkout as a guest
- THEN the system SHALL allow order placement without account
- AND the order SHALL be associated with a guest identifier (session or cookie)

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
