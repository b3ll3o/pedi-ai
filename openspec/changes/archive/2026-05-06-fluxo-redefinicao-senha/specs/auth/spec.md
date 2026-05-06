# Delta for Auth Domain — Fluxo de Redefinição de Senha

## ADDED Requirements

### Requirement: Password Reset Page — Customer
The system SHALL provide a password reset page at `/reset-password` for customers to set a new password after clicking the reset link in their email.

#### Scenario: Password Reset Page Renders with Valid Token
- GIVEN a user accesses `/reset-password?token=xxx&type=recovery`
- WHEN the page loads
- THEN the system SHALL display a password reset form
- AND the form SHALL contain fields for "Nova senha" and "Confirmar senha"
- AND the form SHALL contain a "Redefinir senha" submit button
- AND the page SHALL NOT display an error message

#### Scenario: Password Reset Page Shows Error with Invalid Token
- GIVEN a user accesses `/reset-password` with an invalid or expired token
- WHEN the page loads
- THEN the system SHALL display an error message indicating the token is invalid or expired
- AND the system SHALL display a link to request a new password reset email

#### Scenario: Password Reset Page Shows Error without Token
- GIVEN a user accesses `/reset-password` without a token query parameter
- WHEN the page loads
- THEN the system SHALL display an error message indicating the token is missing
- AND the system SHALL redirect the user to `/login` after 3 seconds

### Requirement: Password Reset Page — Admin
The system SHALL provide a password reset page at `/admin/reset-password` for admin users (owner, manager, staff) to set a new password.

#### Scenario: Admin Password Reset Page Renders with Valid Token
- GIVEN an admin user accesses `/admin/reset-password?token=xxx&type=recovery`
- WHEN the page loads
- THEN the system SHALL display a password reset form styled for admin
- AND the form SHALL contain fields for "Nova senha" and "Confirmar senha"
- AND the form SHALL contain a "Redefinir senha" submit button

#### Scenario: Admin Password Reset Page Shows Error with Invalid Token
- GIVEN an admin user accesses `/admin/reset-password` with an invalid or expired token
- WHEN the page loads
- THEN the system SHALL display an error message indicating the token is invalid or expired
- AND the system SHALL provide a way to request a new reset email

### Requirement: Password Reset API Route
The system SHALL provide a server-side API route at `/api/auth/reset-password` to validate the token and update the user's password.

#### Scenario: API Route Updates Password with Valid Token
- GIVEN a POST request to `/api/auth/reset-password` with valid `{ token: "xxx", novaSenha: "newPassword123" }`
- WHEN the request is processed
- THEN the system SHALL validate the token with Supabase Auth
- AND the system SHALL update the user's password
- AND the system SHALL return HTTP 200 with `{ success: true, message: "Senha atualizada com sucesso" }`

#### Scenario: API Route Returns Error with Invalid Token
- GIVEN a POST request to `/api/auth/reset-password` with invalid `{ token: "invalid", novaSenha: "newPassword123" }`
- WHEN the request is processed
- THEN the system SHALL return HTTP 400 with `{ success: false, error: "Token inválido ou expirado" }`

#### Scenario: API Route Returns Error with Missing Fields
- GIVEN a POST request to `/api/auth/reset-password` with missing fields
- WHEN the request is processed
- THEN the system SHALL return HTTP 400 with `{ success: false, error: "Token e nova senha são obrigatórios" }`

### Requirement: Password Reset Form Validation
The password reset form MUST validate user input before submission.

#### Scenario: Form Validates Password Match
- GIVEN a user fills the password reset form
- WHEN the user enters different values in "Nova senha" and "Confirmar senha"
- THEN the system SHALL display an error message "As senhas não coincidem"
- AND the form SHALL NOT allow submission

#### Scenario: Form Validates Password Minimum Length
- GIVEN a user fills the password reset form
- WHEN the user enters a password with less than 6 characters
- THEN the system SHALL display an error message "A senha deve ter pelo menos 6 caracteres"
- AND the form SHALL NOT allow submission

#### Scenario: Form Submits with Valid Data
- GIVEN a user fills the password reset form with valid matching passwords
- WHEN the user clicks "Redefinir senha"
- THEN the system SHALL submit the token and new password to `/api/auth/reset-password`
- AND the system SHALL display a loading state during submission

### Requirement: Password Reset Success Flow
After successful password reset, the system SHALL redirect the user to the login page with a success message.

#### Scenario: User Redirected to Login After Successful Reset
- GIVEN a user has submitted a valid password reset
- WHEN the password is successfully updated
- THEN the system SHALL redirect the user to `/login?reset=success`
- AND the login page SHALL display a success message "Senha redefinida com sucesso. Faça login com sua nova senha."

#### Scenario: User Can Login with New Password
- GIVEN a user has successfully reset their password
- WHEN the user enters their email and new password on the login page
- THEN the system SHALL authenticate the user successfully
- AND the user SHALL be redirected based on their role

### Requirement: resetPassword Function with Redirect URL
The `resetPassword` function in `src/lib/supabase/auth.ts` SHALL accept a `redirectTo` parameter to specify the callback URL.

#### Scenario: resetPassword Passes Correct Redirect URL
- GIVEN a call to `resetPassword(email, "/reset-password")`
- WHEN the function executes
- THEN it SHALL call `supabase.auth.resetPasswordForEmail(email, { redirectTo: "/reset-password" })`
- AND the email SHALL contain a link pointing to the configured redirect URL

---

## MODIFIED Requirements

### Requirement: Password Reset (Modified)
The existing "Password Reset" requirement at lines 121-135 of the main auth spec is expanded to include the full UI and API implementation details.

**Previous behavior:** System sends password reset email but does not have a page to handle the token.

**New behavior:** System sends password reset email with a link to `/reset-password?token=xxx`, the page validates the token and presents a form, the API route updates the password, and the user is redirected to login.

---

## REMOVED Requirements

None.