# Delta for Auth

## ADDED Requirements

### Requirement: Email Template Branding
The system SHALL use branded email templates for all authentication-related emails sent by the system.

#### Scenario: Branded Confirmation Email
- GIVEN a user completes registration
- WHEN the system sends the confirmation email
- THEN the email SHALL display the Pedi-AI brand identity
- AND the email SHALL use the color palette (#E85D04, #F48C06, #DC2626)
- AND the email SHALL include the Pedi-AI logo
- AND the email SHALL display a prominent "Confirm Email" call-to-action button

#### Scenario: Branded Password Reset Email
- GIVEN a user requests a password reset
- WHEN the system sends the password reset email
- THEN the email SHALL display the Pedi-AI brand identity
- AND the email SHALL use the same visual styling as the confirmation email

#### Scenario: Branded Staff Invitation Email
- GIVEN an admin creates a new staff user
- WHEN the system sends the invitation email
- THEN the email SHALL display the Pedi-AI brand identity
- AND the email SHALL use the same visual styling as other auth emails

#### Scenario: Email Template Compatibility
- GIVEN the branded email template is rendered in an email client
- WHEN the email is viewed
- THEN the template SHALL be compatible with Gmail, Outlook, and Apple Mail
- AND the template SHALL use table-based layout for maximum compatibility
- AND the template SHALL include fallback text for links when buttons don't render

### Requirement: Email Subject Line
The system SHALL use descriptive subject lines for authentication emails.

#### Scenario: Confirmation Email Subject
- GIVEN a user completes registration
- WHEN the confirmation email is sent
- THEN the subject line SHALL contain "Confirme seu email" or similar Portuguese confirmation language
- AND the subject line SHALL reference "Pedi-AI"

#### Scenario: Password Reset Email Subject
- GIVEN a user requests a password reset
- WHEN the reset email is sent
- THEN the subject line SHALL contain "Redefinir senha" or similar Portuguese language

## MODIFIED Requirements

None.

## REMOVED Requirements

None.