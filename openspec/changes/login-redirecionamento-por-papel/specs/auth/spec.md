# Delta for Auth — Login Role-Based Redirect

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

---

## MODIFIED Requirements

### Requirement: Login Post-Authentication Redirect (Modified)
The login page at `/login` MUST redirect users based on their role after authentication, instead of always redirecting to `/menu`.

**Previous behavior:** All users redirected to `/menu` unconditionally.
**New behavior:** Users with role `owner`, `manager`, or `staff` redirect to `/admin/dashboard`; users with role `cliente` or no profile redirect to `/menu`.

---

## REMOVED Requirements

None.
