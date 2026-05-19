/**
 * Admin Authentication Helpers
 * Helper functions for admin role-based authentication and authorization.
 * Uses getSession from @/lib/auth/session (no Supabase).
 */

import { getSession } from '@/lib/auth/session';

export type Role = 'dono' | 'gerente' | 'atendente';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  restaurant_id: string;
}

/**
 * Require a valid authenticated admin user.
 * Uses server-side session from cookies via getSession().
 * Throws an error if no session or user not found.
 */
async function requireAuth(): Promise<AuthUser> {
  const session = await getSession();

  if (!session) {
    throw new Error('Não autenticado');
  }

  if (!session.user.restaurantId) {
    throw new Error('Usuário sem restaurante asociado');
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role as Role,
    restaurant_id: session.user.restaurantId,
  };
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
