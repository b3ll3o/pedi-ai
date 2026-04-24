/**
 * Admin Authentication Helpers
 * Helper functions for admin role-based authentication and authorization.
 */

import { getSession } from '@/lib/supabase/auth'
import { createClient } from '@/lib/supabase/client'
import type { Enum_user_role, users_profiles } from '@/lib/supabase/types'

export type Role = Extract<Enum_user_role, 'owner' | 'manager' | 'staff'>

export interface AuthUser {
  id: string
  email: string
  role: Role
  restaurant_id: string
}

/**
 * Require a valid authenticated admin user.
 * Throws an error if no session or user not found in database.
 */
async function requireAuth(): Promise<AuthUser> {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Não autenticado')
  }

  const supabase = createClient()

  const { data: profile, error } = await supabase
    .from('users_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (error || !profile) {
    throw new Error('Usuário não encontrado')
  }

  // Cast from generic Json types to expected string types
  const typedProfile = profile as unknown as users_profiles

  return {
    id: typedProfile.id,
    email: typedProfile.email,
    role: typedProfile.role as Role,
    restaurant_id: typedProfile.restaurant_id,
  }
}

/**
 * Verify that the user has one of the allowed roles.
 * Throws a 403 error if the user's role is not in the allowed list.
 */
function requireRole(user: AuthUser, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(user.role)) {
    const error = new Error('Acesso negado') as Error & { status?: number }
    error.status = 403
    throw error
  }
}

/**
 * Extract restaurant_id from AuthUser.
 * Helper for convenience when only the restaurant ID is needed.
 */
function getRestaurantId(user: AuthUser): string {
  return user.restaurant_id
}

export { requireAuth, requireRole, getRestaurantId }
