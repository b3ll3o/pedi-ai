/**
 * Admin Authentication Helpers - Client Safe
 * Helper functions for admin role-based authentication in Client Components.
 * Uses createBrowserClient for browser-side authentication.
 */

import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Enum_user_role, users_profiles } from '@/lib/supabase/types'

export type Role = Extract<Enum_user_role, 'owner' | 'manager' | 'staff'>

export interface AuthUser {
  id: string
  email: string
  role: Role
  restaurant_id: string
}

/**
 * Require a valid authenticated admin user (Client Component version).
 * Uses browser-side Supabase client to read session from cookies.
 * Uses service role key to query users_profiles (bypasses RLS).
 * Throws an error if no session or user not found in database.
 */
async function requireAuth(): Promise<AuthUser> {
  // Browser client for session validation - reads cookies automatically
  const supabaseAuth = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()

  if (userError || !user) {
    throw new Error('Não autenticado')
  }

  // Admin client for data queries - uses SERVICE ROLE KEY to bypass RLS
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
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
