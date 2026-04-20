# Delta for Testes E2E - Recuperação de Senha

## ADDED Requirements

### Requirement: E2E Test for Password Reset Flow
The E2E test suite SHALL cover the complete password reset flow for admin users.

#### Scenario: Password Reset Request
- GIVEN an admin user is on the login page
- WHEN the user clicks "Esqueci minha senha" link
- THEN the system SHALL display the password reset form
- AND the user SHALL be able to enter their email address

#### Scenario: Password Reset Email Sent Confirmation
- GIVEN an admin user has submitted a valid email for password reset
- WHEN the email exists in the system
- THEN the system SHALL display a confirmation message
- AND the system SHALL indicate that an email was sent

#### Scenario: Password Reset via Link
- GIVEN a user has received a password reset email
- WHEN the user clicks the reset link
- THEN the system SHALL display the new password form
- AND the user SHALL be able to set a new password

#### Scenario: Login with New Password After Reset
- GIVEN a user has successfully reset their password
- WHEN the user attempts to login with the new password
- THEN the system SHALL authenticate the user successfully
- AND the user SHALL be redirected to the admin dashboard

#### Scenario: Password Reset with Invalid Email
- GIVEN an admin user enters a non-existent email for password reset
- WHEN the user submits the reset request
- THEN the system SHALL display an error message indicating the email was not found

### Requirement: AdminLoginPage Testability
The AdminLoginPage object SHALL provide methods to support password reset testing.

#### Scenario: Forgot Password Navigation
- GIVEN a user is on the login page
- WHEN the user needs to reset their password
- THEN the AdminLoginPage SHALL provide a `forgotPassword()` method to access the reset form

#### Scenario: Password Reset Form Submission
- GIVEN a user is on the password reset form
- WHEN the user enters their email
- THEN the AdminLoginPage SHALL provide a `submitForgotPassword(email)` method

#### Scenario: New Password Submission
- GIVEN a user is on the reset link page with a valid token
- WHEN the user enters a new password
- THEN the AdminLoginPage SHALL provide a `submitNewPassword(password)` method

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.