/**
 * useRedirectByRole Hook
 * Hook para redirecionamento baseado no papel do usuário após login.
 * Consulta users_profiles via SERVICE_ROLE_KEY e determina destino:
 * - owner|manager|staff → /admin/dashboard
 * - demais perfis ou erro → /menu
 */

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { users_profiles } from '@/lib/supabase/types';

export interface UseRedirectByRoleResult {
  destination: '/admin/dashboard' | '/menu';
  isLoading: boolean;
  role: string | null;
}

const ADMIN_ROLES = ['owner', 'manager', 'staff'] as const;

export function useRedirectByRole(userId: string | null): UseRedirectByRoleResult {
  const [destination, setDestination] = useState<'/admin/dashboard' | '/menu'>('/menu');
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setDestination('/menu');
      setRole(null);
      setIsLoading(false);
      return;
    }

    async function fetchRoleAndRedirect() {
      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: profile, error } = await supabaseAdmin
          .from('users_profiles')
          .select('role')
          .eq('user_id', userId)
          .single();

        if (error || !profile) {
          setDestination('/menu');
          setRole(null);
          return;
        }

        const typedProfile = profile as unknown as users_profiles;
        const userRole = typedProfile.role;

        setRole(userRole);

        if (ADMIN_ROLES.includes(userRole as typeof ADMIN_ROLES[number])) {
          setDestination('/admin/dashboard');
        } else {
          setDestination('/menu');
        }
      } catch {
        setDestination('/menu');
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchRoleAndRedirect();
  }, [userId]);

  return {
    destination,
    isLoading,
    role,
  };
}
