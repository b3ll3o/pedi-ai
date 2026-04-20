import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Enum_user_role, users_profiles } from '@/lib/supabase/types';

export type Role = Enum_user_role;

export type UseRoleResponse = {
  role: Role | null;
  hasPermission: (requiredRole: Role) => boolean;
  isOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
};

// Role hierarchy: owner > manager > staff
const ROLE_ORDER: Record<Role, number> = {
  staff: 1,
  manager: 2,
  owner: 3,
};

function computeRoleResponse(profile: users_profiles | null): UseRoleResponse {
  const role = profile?.role ?? null;

  const hasPermission = (requiredRole: Role): boolean => {
    if (!role) return false;
    return ROLE_ORDER[role] >= ROLE_ORDER[requiredRole];
  };

  return {
    role,
    hasPermission,
    isOwner: role === 'owner',
    isManager: role === 'manager',
    isStaff: role === 'staff',
  };
}

/**
 * Returns the current user's role and permission helpers.
 * Fetches the user's profile from users_profiles table.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useRole();
 * const { role, hasPermission, isOwner } = data ?? {};
 *
 * if (isOwner) { ... }
 * if (hasPermission?.('manager')) { ... }
 * ```
 */
export function useRole(): UseQueryResult<UseRoleResponse> {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('users_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        return null;
      }

      return data as users_profiles;
    },
    select: computeRoleResponse,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
