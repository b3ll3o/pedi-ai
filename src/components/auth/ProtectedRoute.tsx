'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Enum_user_role } from '@/lib/supabase/types';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: Enum_user_role[];
}

type UserRole = Enum_user_role;

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  userRole: UserRole | null;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    userId: null,
    userRole: null,
  });

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          userRole: null,
        });
        return;
      }

      // Fetch user profile to get role
      const userId = session.user.id;
      const { data: profile } = await supabase
        .from('users_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        userId,
        userRole: profile?.role ?? null,
      });
    }

    checkAuth();
  }, []);

  useEffect(() => {
    if (authState.isLoading) return;

    if (!authState.isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!authState.userRole || !allowedRoles.includes(authState.userRole)) {
        // Redirect to appropriate page based on role
        const redirectPath = getRedirectPath(authState.userRole);
        router.replace(redirectPath);
      }
    }
  }, [authState, router]);

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (!authState.isAuthenticated || (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(authState.userRole!))) {
    return null;
  }

  return <>{children}</>;
}

function getRedirectPath(role: UserRole | null): string {
  switch (role) {
    case 'owner':
      return '/admin/owner';
    case 'manager':
      return '/admin/manager';
    case 'staff':
      return '/admin/staff';
    default:
      return '/';
  }
}
