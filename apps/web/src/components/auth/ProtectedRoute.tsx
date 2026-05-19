'use client';

import { type ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/auth/client';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: any[];
}

type UserRole = any;

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
      const session = await getSession();

      if (!session?.user) {
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          userId: null,
          userRole: null,
        });
        return;
      }

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        userId: session.user.id,
        userRole: session.user.role as any | null,
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
  }, [authState, router, allowedRoles]);

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (
    !authState.isAuthenticated ||
    (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(authState.userRole!))
  ) {
    return null;
  }

  return <>{children}</>;
}

function getRedirectPath(role: UserRole | null): string {
  switch (role) {
    case 'dono':
      return '/admin/owner';
    case 'gerente':
      return '/admin/manager';
    case 'atendente':
      return '/admin/staff';
    default:
      return '/';
  }
}
