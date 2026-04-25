# Design: Email de Confirmação Customizado - Pedi-AI

## Technical Approach

This change involves:
1. Template files created in `src/templates/email/` (code change completed)
2. Obtaining a publicly accessible URL for the Pedi-AI logo
3. Copying the template HTML content to Supabase Authentication settings
4. Documenting the template variables and structure for future maintenance

## Architecture Decisions

### Decision: Logo Hosting Strategy

**Choice**: Use Supabase Storage to host the logo image

**Alternatives considered**:
- Using production domain URL (requires deployment to be live)
- Base64 inline encoding (not recommended - increases email size and spam filter issues)
- External CDN (adds dependency)

**Rationale**: Supabase Storage is already configured for this project and provides a reliable, CORS-enabled bucket for static assets. The logo can be uploaded to the existing storage bucket and accessed via a public URL.

### Decision: Email Template Structure

**Choice**: Table-based HTML layout with inline CSS styles

**Alternatives considered**:
- External CSS file (not supported by most email clients)
- CSS classes (not reliably supported in email clients)
- Framework-based templates (e.g., MJML) - overkill for this use case

**Rationale**: Table-based layouts are the most compatible approach for email clients, especially Outlook. Inline styles ensure maximum rendering consistency across clients.

### Decision: Template Configuration Method

**Choice**: Configure directly in Supabase Dashboard

**Alternatives considered**:
- Programmatic configuration via Supabase CLI (no CLI command for email templates)
- API-based configuration (Supabase doesn't expose email template API)

**Rationale**: The Supabase Dashboard is the only official method to configure custom email templates. This is a manual configuration step documented in the implementation tasks.

## Data Flow

```
User Registration → Supabase Auth → Email Template (branded) → User Email
                                      ↑
                                      ↓
                              Dashboard Configuration
                              (Email Templates section)
```

## File Changes

### Files Created (13 templates):
- `src/templates/email/confirmation.html` - Confirm Signup
- `src/templates/email/reset-password.html` - Reset Password
- `src/templates/email/staff-invitation.html` - Invite User
- `src/templates/email/magic-link.html` - Magic Link
- `src/templates/email/email-change.html` - Change Email Address
- `src/templates/email/reauthentication.html` - Reauthentication
- `src/templates/email/password-changed.html` - Password Changed Notification
- `src/templates/email/email-changed.html` - Email Address Changed Notification
- `src/templates/email/phone-changed.html` - Phone Number Changed Notification
- `src/templates/email/identity-linked.html` - Identity Linked Notification
- `src/templates/email/identity-unlinked.html` - Identity Unlinked Notification
- `src/templates/email/mfa-factor-enrolled.html` - MFA Factor Enrolled Notification
- `src/templates/email/mfa-factor-unenrolled.html` - MFA Factor Unenrolled Notification
- `src/templates/email/partials/header.html` - Header partial
- `src/templates/email/partials/footer.html` - Footer partial

### External Configuration Required:
- Supabase Dashboard → Authentication → Email Templates (copy HTML from template files)
- Supabase Storage (logo upload)

### No Repository Files Modified:
Only new template files were added; no existing code was modified.

## Interfaces / Contracts

### Supabase Email Template Variables

| Variable | Description | Usage in Template |
|----------|-------------|-------------------|
| `{{ .User.Email }}` | User's email address | Greeting line |
| `{{ .ConfirmationURL }}` | Email confirmation link | CTA button href |
| `{{ .Token }}` | Confirmation token | Fallback link (if URL not used) |
| `{{ .TokenHash }}` | Hashed token | Alternative confirmation method |
| `{{ .OTP }}` | One-time password | For MFA scenarios |
| `{{ .SiteURL }}` | Configured site URL | Base for confirmation link |

### Email Template Requirements

- Subject line: Portuguese language
- HTML content with inline styles
- Table-based layout for compatibility
- Max-width: 480px
- Mobile-responsive (fluid layout)
- Branded header with gradient (#E85D04 → #F48C06)
- Clear CTA button
- Security disclaimer
- Footer with copyright

## Testing Strategy

1. **Manual Testing**:
   - Create a test account
   - Receive confirmation email
   - Verify branding elements render correctly
   - Test link functionality

2. **Multi-Client Testing**:
   - Gmail (web and mobile)
   - Outlook (desktop and mobile)
   - Apple Mail
   - Yahoo Mail

3. **Spam Score Check**:
   - Use tools like MailTester or similar to verify spam score

## Migration / Rollback

### Migration (Forward)
1. Upload logo to Supabase Storage
2. Get public URL for logo
3. Access Supabase Dashboard → Authentication → Email Templates
4. Edit "Confirm signup" template
5. Paste branded HTML template
6. Replace `https://seu-dominio.com/logo.png` with actual logo URL
7. Save template

### Rollback
1. Access Supabase Dashboard → Authentication → Email Templates
2. Click "Reset to default" or paste Supabase default template
3. Save

## Open Questions

1. **Logo URL**: The exact public URL for the logo needs to be determined after upload to Supabase Storage. The template placeholder `https://seu-dominio.com/logo.png` must be replaced with the actual URL.

2. **Template Coverage**: Todos os 13 templates do Supabase Auth agora têm templates customizados. Não há necessidade de templates adicionais no momento.

3. **Email Testing Tools**: Consider integrating an email testing tool (e.g., Mailtrap, Mailhog) for development testing before production configuration.