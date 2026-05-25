/**
 * Admin Authentication Helpers - Client Safe
 * Helper functions for admin role-based authentication in Client Components.
 * Uses API calls to /api/auth/* routes.
 */

export type Role = 'dono' | 'gerente' | 'atendente';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  restaurant_id: string;
}

/**
 * Fetch wrapper for API calls.
 */
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Require a valid authenticated admin user (Client Component version).
 * Calls GET /api/auth/session to validate session and get user profile.
 * Throws an error if no session or user not found.
 */
async function requireAuth(): Promise<AuthUser> {
  const session = await apiFetch<{
    user?: { id: string; email: string; role: Role; restaurant_id: string };
    error?: string;
  }>('/api/auth/session');

  if (!session?.user) {
    throw new Error(session?.error || 'Não autenticado');
  }

  return session.user;
}

/**
 * Verify that the user has one of the allowed roles.
 * Throws a 403 error if the user's role is not in the allowed list.
 */
function requireRole(user: AuthUser, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(user.role)) {
    const error = new Error('Acesso negado') as Error & { status?: number };
    error.status = 403;
    throw error;
  }
}

/**
 * Extract restaurant_id from AuthUser.
 * Helper for convenience when only the restaurant ID is needed.
 */
function getRestaurantId(user: AuthUser): string {
  return user.restaurant_id;
}

export { requireAuth, requireRole, getRestaurantId };
