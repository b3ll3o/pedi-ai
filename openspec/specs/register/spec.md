# Spec for Register Feature

## ADDED Requirements

### Requirement: Client Registration Page
The system SHALL provide a registration page at `/register` for new customers.

#### Scenario: Display Registration Form
- GIVEN a user is not authenticated
- WHEN the user navigates to `/register`
- THEN the system SHALL display the registration form
- AND the form SHALL include fields for: name (optional), email, password, and password confirmation
- AND the form SHALL display a "Criar Conta" submit button
- AND the form SHALL display a link to `/login`

#### Scenario: Successful Registration
- GIVEN a user is not authenticated
- WHEN the user fills in a valid email and matching passwords (minimum 6 characters)
- AND the user clicks "Criar Conta"
- THEN the system SHALL call Supabase Auth `signUp` with the provided credentials
- AND the system SHALL redirect the user to `/login?registered=true`

#### Scenario: Email Already Registered
- GIVEN a user attempts to register with an email that already exists
- WHEN the user submits the registration form
- THEN the system SHALL display an error message indicating the email is already in use
- AND the system SHALL not create a duplicate account

#### Scenario: Password Mismatch
- GIVEN a user fills in the registration form with different passwords
- WHEN the user submits the registration form
- THEN the system SHALL display the error message "As senhas não coincidem"
- AND the system SHALL not attempt registration

#### Scenario: Authenticated User Redirect
- GIVEN an authenticated user has an active session
- WHEN the user navigates to `/register`
- THEN the system SHALL redirect the user to `/menu`

### Requirement: Client-Side Validation
The system SHALL validate registration inputs on the client before submission.

#### Scenario: Invalid Email Format
- GIVEN a user enters an invalid email format
- WHEN the user attempts to submit the form
- THEN the system SHALL display a validation error for the email field
- AND the system SHALL prevent form submission

#### Scenario: Password Too Short
- GIVEN a user enters a password with fewer than 6 characters
- WHEN the user attempts to submit the form
- THEN the system SHALL display a validation error indicating minimum 6 characters
- AND the system SHALL prevent form submission

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.
