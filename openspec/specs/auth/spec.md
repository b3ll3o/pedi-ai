# Spec for Auth Domain

## ADDED Requirements

### Requirement: Login Role Detection
After a successful authentication in `/login`, the system MUST detect the user's role by querying the `users_profiles` table and MUST redirect the user to the appropriate area based on their role.

#### Scenario: Owner Login Redirect
- GIVEN a user with role `owner` successfully authenticates via `/login`
- WHEN the authentication completes
- THEN the system SHALL query `users_profiles` to obtain the user's role
- AND the system SHALL redirect the user to `/admin/dashboard`

#### Scenario: Manager Login Redirect
- GIVEN a user with role `manager` successfully authenticates via `/login`
- WHEN the authentication completes
- THEN the system SHALL query `users_profiles` to obtain the user's role
- AND the system SHALL redirect the user to `/admin/dashboard`

#### Scenario: Staff Login Redirect
- GIVEN a user with role `staff` successfully authenticates via `/login`
- WHEN the authentication completes
- THEN the system SHALL query `users_profiles` to obtain the user's role
- AND the system SHALL redirect the user to `/admin/dashboard`

#### Scenario: Cliente Login Redirect
- GIVEN a user with role `cliente` successfully authenticates via `/login`
- WHEN the authentication completes
- THEN the system SHALL query `users_profiles` to obtain the user's role
- AND the system SHALL redirect the user to `/menu`

#### Scenario: User Without Profile Redirect
- GIVEN a user authenticates via `/login` but has no entry in `users_profiles`
- WHEN the authentication completes
- THEN the system SHALL treat the user as a `cliente`
- AND the system SHALL redirect the user to `/menu`

### Requirement: Session-Based Role Detection
When an authenticated user directly accesses `/login`, the system MUST detect their role from the existing session and MUST redirect to the appropriate area.

#### Scenario: Authenticated Admin Accessing Login Page
- GIVEN an authenticated user with role `owner`, `manager`, or `staff` directly accesses `/login`
- WHEN the session is validated
- THEN the system SHALL redirect the user to `/admin/dashboard`
- AND the user SHALL NOT remain on the login page

#### Scenario: Authenticated Cliente Accessing Login Page
- GIVEN an authenticated user with role `cliente` directly accesses `/login`
- WHEN the session is validated
- THEN the system SHALL redirect the user to `/menu`
- AND the user SHALL NOT remain on the login page

### Requirement: Logout Redirect Consistency
After logout from any area, the system MUST redirect the user to `/login`.

#### Scenario: Admin Logout Redirect
- GIVEN an admin user is logged in
- WHEN the user clicks logout
- THEN the system SHALL clear the session
- AND the system SHALL redirect the user to `/login`

#### Scenario: Customer Logout Redirect
- GIVEN a customer user is logged in
- WHEN the user clicks logout
- THEN the system SHALL clear the session
- AND the system SHALL redirect the user to `/login`

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

### Requirement: Customer Registration
The system SHALL require customers to select their intent during registration.

#### Scenario: Customer Registers with Order Intent
- GIVEN a customer chooses to create an account
- WHEN the customer registers with email and password
- AND selects "Quero fazer pedidos" as their intent
- THEN the system SHALL create a customer account
- AND the system SHALL assign the "cliente" role
- AND the customer SHALL be able to view order history

#### Scenario: Customer Registers with Restaurant Management Intent
- GIVEN a user chooses to create an account
- WHEN the user registers with email and password
- AND selects "Quero gerenciar meu restaurante" as their intent
- THEN the system SHALL create the user account
- AND the system SHALL assign the "dono" role with no restaurant associated
- AND the system SHALL redirect the user to create their first restaurant

#### Scenario: Customer Login
- GIVEN a customer has an account
- WHEN the customer logs in
- THEN the system SHALL authenticate the customer
- AND the customer SHALL be redirected to `/menu`

#### Scenario: Guest Checkout
- GIVEN a customer does not want to create an account
- WHEN the customer proceeds to checkout as a guest
- THEN the system SHALL allow order placement without account
- AND the order SHALL be associated with a guest identifier (session or cookie)

### Requirement: Registration Intent Selection
During registration, the system MUST ask the user to select their intent for using the application.

#### Scenario: Register as Restaurant Owner
- GIVEN a user accesses `/register`
- WHEN the user fills email and password
- AND selects "Quero gerenciar meu restaurante" as their intent
- THEN the system SHALL create the user account in Supabase Auth
- AND the system SHALL create a `users_profiles` entry with `role: 'dono'`
- AND the system SHALL create a `users_profiles` entry with `intent: 'gerenciar_restaurante'`
- AND the system SHALL redirect the user to `/login?registered=true&intent=gerenciar_restaurante`

#### Scenario: Register as Customer
- GIVEN a user accesses `/register`
- WHEN the user fills email and password
- AND selects "Quero fazer pedidos" as their intent
- THEN the system SHALL create the user account in Supabase Auth
- AND the system SHALL create a `users_profiles` entry with `role: 'cliente'`
- AND the system SHALL create a `users_profiles` entry with `intent: 'fazer_pedidos'`
- AND the system SHALL redirect the user to `/login?registered=true&intent=fazer_pedidos`

### Requirement: Post-Registration Redirect
After successful registration, the system MUST redirect the user to the login page with query parameters indicating their intent.

#### Scenario: Owner Intent Redirect After Login
- GIVEN a user has just registered with intent "gerenciar_restaurante"
- WHEN the user logs in for the first time
- THEN the system SHALL detect the user's `intent` from `users_profiles`
- AND the system SHALL redirect the user to `/admin/restaurants/new`

#### Scenario: Customer Intent Redirect After Login
- GIVEN a user has just registered with intent "fazer_pedidos"
- WHEN the user logs in for the first time
- THEN the system SHALL detect the user's `intent` from `users_profiles`
- AND the system SHALL redirect the user to `/menu`

### Requirement: Existing User Login Compatibility
Existing users who registered before this feature MUST receive the default intent.

#### Scenario: Existing User Login Without Intent
- GIVEN an existing user who has no `intent` in their `users_profiles`
- WHEN the user logs in
- THEN the system SHALL treat the user based on their `role`
- AND if `role` is `dono`, `gerente`, or `atendente` the system SHALL redirect to `/admin/dashboard`
- AND if `role` is `cliente` the system SHALL redirect to `/menu`

### Requirement: Guest Session Management
The system SHALL manage anonymous guest sessions to enable checkout without authentication while maintaining order tracking.

#### Scenario: Guest Session Creation
- GIVEN a customer accesses the application without authentication
- WHEN the customer adds an item to cart or initiates checkout
- THEN the system SHALL generate a unique guest session ID using crypto.randomUUID()
- AND the system SHALL store the session in localStorage under the key `pedi-ai-guest-session`
- AND the session SHALL be marked with `isGuest: true`

#### Scenario: Guest Session Structure
- GIVEN a guest session is created
- WHEN the session is stored
- THEN the session object SHALL contain:
  - `id`: A valid UUID v4 generated by crypto.randomUUID()
  - `isGuest`: Boolean set to true
- AND the session SHALL persist across page refreshes

#### Scenario: Guest Session Usage
- GIVEN a guest session exists
- WHEN the guest places an order
- THEN the order SHALL be associated with the guest session ID
- AND the system SHALL allow order tracking without requiring account creation
- AND the system SHALL support converting guest session to registered user (future feature)

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

---

## MODIFIED Requirements

### Requirement: Login Post-Authentication Redirect (Modified)
The login page at `/login` MUST redirect users based on their role after authentication, instead of always redirecting to `/menu`.

**Previous behavior:** All users redirected to `/menu` unconditionally.
**New behavior:** Users with role `owner`, `manager`, or `staff` redirect to `/admin/dashboard`; users with role `cliente` or no profile redirect to `/menu`.

---

## REMOVED Requirements

None.

---

## DDD Architecture Requirements (from implantacao-ddd)

### Requirement: Autenticação Domain Layer — Entities
The domain layer MUST contain authentication-related entities.

#### Scenario: Usuario Entity Exists
- GIVEN the `src/domain/autenticacao/entities/` directory
- WHEN the codebase is inspected
- THEN a `Usuario.ts` entity MUST exist with properties: `id`, `email`, `papel` (dono/gerente/atendente/cliente), `restauranteId`, `criadoEm`
- AND the entity MUST NOT import from Next.js, React, or infrastructure layers

#### Scenario: Sessao Entity Exists
- GIVEN the `src/domain/autenticacao/entities/` directory
- WHEN the codebase is inspected
- THEN a `Sessao.ts` entity MUST exist with properties: `id`, `usuarioId`, `token`, `expiracao`, `dispositivo`
- AND the entity MUST contain session validation logic

### Requirement: Autenticação Domain Layer — Value Objects
The domain layer MUST contain value objects.

#### Scenario: Papel Value Object Exists
- GIVEN the `src/domain/autenticacao/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `Papel.ts` value object MUST exist with values: `dono`, `gerente`, `atendente`, `cliente`

#### Scenario: Credenciais Value Object Exists
- GIVEN the `src/domain/autenticacao/value-objects/` directory
- WHEN the codebase is inspected
- THEN a `Credenciais.ts` value object MUST exist with `email` and `senha` properties
- AND it MUST provide validation for email format and senha strength

### Requirement: Autenticação Domain Layer — Aggregates
The domain layer MUST contain aggregate roots.

#### Scenario: UsuarioAggregate Exists
- GIVEN the `src/domain/autenticacao/aggregates/` directory
- WHEN the codebase is inspected
- THEN a `UsuarioAggregate.ts` aggregate root MUST exist
- AND it MUST encapsulate Usuario entity and role-based access logic

### Requirement: Autenticação Domain Layer — Repository Interfaces
The domain layer MUST define repository interfaces.

#### Scenario: IUsuarioRepository Interface Exists
- GIVEN the `src/domain/autenticacao/repositories/` directory
- WHEN the codebase is inspected
- THEN an `IUsuarioRepository.ts` interface MUST exist with methods: `findById(id)`, `findByEmail(email)`, `save(usuario)`, `delete(id)`

#### Scenario: ISessaoRepository Interface Exists
- GIVEN the `src/domain/autenticacao/repositories/` directory
- WHEN the codebase is inspected
- THEN an `ISessaoRepository.ts` interface MUST exist with methods: `findByToken(token)`, `save(sessao)`, `delete(token)`, `deleteExpired()`

### Requirement: Autenticação Domain Layer — Domain Events
The domain layer MUST define domain events.

#### Scenario: Domain Events Exist
- GIVEN the `src/domain/autenticacao/events/` directory
- WHEN the codebase is inspected
- THEN `UsuarioCriadoEvent.ts`, `SessaoCriadaEvent.ts`, `SessaoExpiradaEvent.ts` event classes MUST exist

### Requirement: Autenticação Application Layer — Use Cases
The application layer MUST contain use case services.

#### Scenario: RegistrarUsuarioUseCase Exists
- GIVEN the `src/application/autenticacao/services/` directory
- WHEN the codebase is inspected
- THEN a `RegistrarUsuarioUseCase.ts` class MUST exist
- AND it MUST create UsuarioAggregate and call Supabase Auth

#### Scenario: AutenticarUsuarioUseCase Exists
- GIVEN the `src/application/autenticacao/services/` directory
- WHEN the codebase is inspected
- THEN an `AutenticarUsuarioUseCase.ts` class MUST exist
- AND it MUST validate credentials and create session

#### Scenario: ValidarSessaoUseCase Exists
- GIVEN the `src/application/autenticacao/services/` directory
- WHEN the codebase is inspected
- THEN a `ValidarSessaoUseCase.ts` class MUST exist
- AND it MUST verify session validity and return usuario data

#### Scenario: RedefinirSenhaUseCase Exists
- GIVEN the `src/application/autenticacao/services/` directory
- WHEN the codebase is inspected
- THEN a `RedefinirSenhaUseCase.ts` class MUST exist
- AND it MUST handle password reset flow via Supabase Auth

### Requirement: Autenticação Infrastructure Layer — Persistence
The infrastructure layer MUST implement repository interfaces.

#### Scenario: UsuarioRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/autenticacao/` directory
- WHEN the codebase is inspected
- THEN a `UsuarioRepository.ts` class MUST exist implementing `IUsuarioRepository`
- AND it MUST use Dexie for local caching

#### Scenario: SessaoRepository Implementation Exists
- GIVEN the `src/infrastructure/persistence/autenticacao/` directory
- WHEN the codebase is inspected
- THEN a `SessaoRepository.ts` class MUST exist implementing `ISessaoRepository`
- AND it MUST handle session persistence

### Requirement: Autenticação Infrastructure Layer — External Adapters
The infrastructure layer MUST contain external API adapters.

#### Scenario: SupabaseAuthAdapter Exists
- GIVEN the `src/infrastructure/external/` directory
- WHEN the codebase is inspected
- THEN a `SupabaseAuthAdapter.ts` class MUST exist
- AND it MUST wrap Supabase Auth operations
- AND it MUST expose a clean interface for use cases

### Requirement: Autenticação Presentation Layer — Boundaries
The presentation layer MUST only contain UI rendering and input collection.

#### Scenario: Auth Pages Delegate to Application Layer
- GIVEN `src/presentation/pages/login.tsx` and `src/presentation/pages/register.tsx`
- WHEN the pages are inspected
- THEN they MUST NOT contain authentication logic
- AND login/register operations MUST delegate to use cases

#### Scenario: Auth Hooks Delegate to Application Layer
- GIVEN `src/presentation/hooks/` contains auth-related hooks
- WHEN the hooks are inspected
- THEN each hook MUST call use cases from `src/application/autenticacao/services/`

#### Scenario: Session State Management
- GIVEN session state is needed in presentation
- WHEN the session state is managed
- THEN the presentation layer MUST use application layer services to get/set session data
- AND the presentation layer MUST NOT access Supabase Auth directly

### Requirement: Autenticação Dependency Rules
The system MUST enforce unidirectional dependency flow between layers.

#### Scenario: Domain Has No External Dependencies
- GIVEN any file in `src/domain/autenticacao/`
- WHEN imports are inspected
- THEN NO import from `src/application/`, `src/infrastructure/`, or `src/presentation/` MUST exist

#### Scenario: Presentation Uses AuthProvider Pattern
- GIVEN authentication state is needed across presentation
- WHEN auth state is accessed
- THEN the presentation layer MUST use an AuthContext that delegates to application layer
- AND the AuthContext MUST NOT bypass application layer