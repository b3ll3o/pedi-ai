# Delta for Auth Testing

## ADDED Requirements

### Requirement: Password Recovery Test Coverage
The system MUST have unit tests for the password recovery flow.

#### Scenario: Unit test for RecuperarSenhaUseCase
- GIVEN `RecuperarSenhaUseCase` exists in the application layer
- WHEN executed with a valid email
- THEN it SHALL call `SupabaseAuthAdapter.enviarEmailRecuperacao()`
- AND it SHALL return success without throwing

#### Scenario: Unit test for RedefinirSenhaUseCase
- GIVEN `RedefinirSenhaUseCase` exists in the application layer
- WHEN executed with valid token and new password
- THEN it SHALL call `SupabaseAuthAdapter.redefinirSenha()`
- AND it SHALL return the updated user

### Requirement: E2E test for password recovery flow
The system MUST have E2E tests covering the complete password recovery journey.

#### Scenario: E2E - Request password reset
- GIVEN a user is on the login page
- WHEN the user clicks "Esqueci minha senha"
- THEN the system SHALL display the password reset request form
- AND the user SHALL be able to submit their email

#### Scenario: E2E - Complete password reset flow
- GIVEN a user has requested a password reset
- WHEN the user clicks the reset link in the email
- THEN the system SHALL display the new password form
- AND the user SHALL be able to set a new password
- AND the user SHALL be redirected to login with success message
