# Delta for Auth Domain

## ADDED Requirements

### Requirement: Admin Route Middleware
The system SHALL protect all /admin/* routes with authentication middleware.

#### Scenario: Redirect to Login on Unauthenticated Access
- GIVEN an unauthenticated user attempts to access /admin/dashboard
- WHEN the middleware runs
- THEN the user SHALL be redirected to /admin/login
- AND the original request URL SHALL be preserved in the redirect query param

#### Scenario: Allow Authenticated Admin Users
- GIVEN an authenticated user with a valid Supabase session accesses /admin/orders
- WHEN the middleware validates the session token
- THEN the middleware SHALL call getSession() to verify validity
- AND the request SHALL be allowed to proceed

#### Scenario: Reject Expired Sessions at Middleware Level
- GIVEN an admin user session has expired
- WHEN the user makes a request to /admin/*
- THEN the middleware SHALL return a redirect to /admin/login
- AND the user SHALL not reach the protected route handler

### Requirement: Server-Side Role Verification
The system SHALL verify user roles on API endpoints, not just UI.

#### Scenario: Validate Role on Admin API Request
- GIVEN an API request is made to /api/admin/users
- WHEN the API handler is invoked
- THEN the system SHALL call getSession() to extract user ID
- AND the system SHALL query the users table to verify the user's role
- AND if the role is insufficient, the API SHALL return 403 Forbidden

#### Scenario: Restaurant ID Extraction from Session
- GIVEN an authenticated admin user makes a request to /api/admin/categories
- WHEN the API handler processes the request
- THEN the system SHALL extract restaurant_id from the user's session
- AND the restaurant_id SHALL be used to scope all database queries
- AND the API SHALL NOT accept restaurant_id in the request body

### Requirement: Session Refresh on Activity
The system SHALL refresh the user session on activity to prevent premature expiry.

#### Scenario: Session Activity Refresh
- GIVEN an admin user is actively using the admin panel
- WHEN the user performs an action (click, form submit)
- THEN the system SHOULD refresh the Supabase session if needed
- AND the session expiry SHALL be extended

---

## MODIFIED Requirements

None.

---

## REMOVED Requirements

None.