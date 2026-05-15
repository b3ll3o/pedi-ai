/**
 * useRedirectByRole Hook
 * Hook para redirecionamento baseado no papel do usuário após login.
 * Busca perfil via API route /api/auth/profile (server-side) e determina destino:
 * - dono|gerente|atendente sem restaurante → /admin/restaurants/new
 * - dono|gerente|atendente com restaurante → /admin/dashboard
 * - demais perfis ou erro → /menu
 */

import { useEffect, useState, useRef } from 'react';

export interface UseRedirectByRoleResult {
  destination: '/admin/dashboard' | '/admin/restaurants/new' | '/menu';
  isLoading: boolean;
  role: string | null;
  hasDeterminedDestination: boolean;
}

const ADMIN_ROLES = ['dono', 'gerente', 'atendente'] as const;

interface ProfileResponse {
  role: string;
  restaurant_id: string | null;
}

export function useRedirectByRole(userId: string | null, _isAuthenticated: boolean): UseRedirectByRoleResult {
  const [destination, setDestination] = useState<'/admin/dashboard' | '/admin/restaurants/new' | '/menu'>(() => {
    if (!userId) return '/menu';
    return '/menu';
  });
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => true);
  const [hasDeterminedDestination, setHasDeterminedDestination] = useState(() => !userId);

  const isMountedRef = useRef(true);
  const userIdRef = useRef(userId);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      // Usar startTransition para evitar cascading renders
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(false);
       
      setHasDeterminedDestination(true);
      return;
    }

    setHasDeterminedDestination(false);
    setIsLoading(true);

    async function fetchRoleAndRedirect() {
      try {
        // Usar API route server-side para buscar perfil
        // (SUPABASE_SERVICE_ROLE_KEY não está disponível no browser)
        const response = await fetch('/api/auth/profile');

        if (!isMountedRef.current) return;

        if (!response.ok) {
          setDestination('/menu');
          setRole(null);
          setHasDeterminedDestination(true);
          return;
        }

        const profile: ProfileResponse = await response.json();

        if (!isMountedRef.current) return;

        const userRole = profile.role;

        setRole(userRole);

        if (ADMIN_ROLES.includes(userRole as typeof ADMIN_ROLES[number])) {
          if (userRole === 'dono' && !profile.restaurant_id) {
            setDestination('/admin/restaurants/new');
          } else {
            setDestination('/admin/dashboard');
          }
        } else {
          setDestination('/menu');
        }
        setHasDeterminedDestination(true);
      } catch {
        if (!isMountedRef.current) return;
        setDestination('/menu');
        setRole(null);
        setHasDeterminedDestination(true);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    fetchRoleAndRedirect();
  }, [userId]);

  return {
    destination,
    isLoading,
    role,
    hasDeterminedDestination,
  };
}
