/**
 * useRedirectByRole Hook
 * Hook para redirecionamento baseado no papel do usuário após login.
 * Consulta users_profiles via SERVICE_ROLE_KEY e determina destino:
 * - dono|gerente|atendente sem restaurante → /admin/restaurants/new
 * - dono|gerente|atendente com restaurante → /admin/dashboard
 * - demais perfis ou erro → /menu
 */

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { users_profiles } from '@/lib/supabase/types';

export interface UseRedirectByRoleResult {
  destination: '/admin/dashboard' | '/admin/restaurants/new' | '/menu';
  isLoading: boolean;
  role: string | null;
}

const ADMIN_ROLES = ['dono', 'gerente', 'atendente'] as const;

export function useRedirectByRole(userId: string | null): UseRedirectByRoleResult {
  const [destination, setDestination] = useState<'/admin/dashboard' | '/admin/restaurants/new' | '/menu'>(() => {
    // Estado inicial: sem usuário logado, vai para /menu
    if (!userId) return '/menu';
    return '/menu';
  });
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    // Sem usuário = não está carregando (já temos o destino final)
    return !userId;
  });

  useEffect(() => {
    // Early return: sem usuário, o estado inicial já está correto
    if (!userId) {
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
          .select('role, restaurant_id')
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
          if (userRole === 'dono' && !typedProfile.restaurant_id) {
            setDestination('/admin/restaurants/new');
          } else {
            setDestination('/admin/dashboard');
          }
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
