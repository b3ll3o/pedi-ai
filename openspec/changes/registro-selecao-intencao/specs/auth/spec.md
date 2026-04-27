# Delta for Auth — Registro com Seleção de Intenção

## ADDED Requirements

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

---

## MODIFIED Requirements

### Requirement: Customer Registration (Modified)
**Previous:** Customer could register without specifying intent.
**New:** Customer MUST select one of two intents during registration: "gerenciar_restaurante" or "fazer_pedidos".

### Requirement: Role Names in Portuguese (Modified)
**Previous:** Roles were named in English: `owner`, `manager`, `staff`.
**New:** Roles MUST be named in Portuguese: `dono`, `gerente`, `atendente`, `cliente`.

---

## REMOVED Requirements

None.
