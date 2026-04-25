import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useRole } from '@/hooks/useRole';
import type { users_profiles } from '@/lib/supabase/types';

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

const mockOwnerProfile: users_profiles = {
  id: 'profile-1',
  user_id: 'user-123',
  restaurant_id: 'rest-123',
  role: 'owner',
  name: 'Owner User',
  email: 'owner@test.com',
  created_at: '2024-01-01T00:00:00Z',
};

const mockManagerProfile: users_profiles = {
  id: 'profile-2',
  user_id: 'user-456',
  restaurant_id: 'rest-123',
  role: 'manager',
  name: 'Manager User',
  email: 'manager@test.com',
  created_at: '2024-01-01T00:00:00Z',
};

const mockStaffProfile: users_profiles = {
  id: 'profile-3',
  user_id: 'user-789',
  restaurant_id: 'rest-123',
  role: 'staff',
  name: 'Staff User',
  email: 'staff@test.com',
  created_at: '2024-01-01T00:00:00Z',
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useRole hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Role detection', () => {
    it('returns owner role when user is owner', async () => {
      (mockSupabaseClient.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });
      
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockOwnerProfile, error: null }),
          }),
        }),
      };
      (mockSupabaseClient.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom);

      const { result } = renderHook(() => useRole(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.role).toBe('owner');
      expect(result.current.data?.isOwner).toBe(true);
      expect(result.current.data?.isManager).toBe(false);
      expect(result.current.data?.isStaff).toBe(false);
    });

    it('returns manager role when user is manager', async () => {
      (mockSupabaseClient.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-456' } },
      });
      
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockManagerProfile, error: null }),
          }),
        }),
      };
      (mockSupabaseClient.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom);

      const { result } = renderHook(() => useRole(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.role).toBe('manager');
      expect(result.current.data?.isOwner).toBe(false);
      expect(result.current.data?.isManager).toBe(true);
      expect(result.current.data?.isStaff).toBe(false);
    });

    it('returns staff role when user is staff', async () => {
      (mockSupabaseClient.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-789' } },
      });
      
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockStaffProfile, error: null }),
          }),
        }),
      };
      (mockSupabaseClient.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom);

      const { result } = renderHook(() => useRole(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.role).toBe('staff');
      expect(result.current.data?.isOwner).toBe(false);
      expect(result.current.data?.isManager).toBe(false);
      expect(result.current.data?.isStaff).toBe(true);
    });
  });

  describe('2. Role hierarchy - hasPermission', () => {
    beforeEach(() => {
      (mockSupabaseClient.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });
    });

    it('owner has permission for owner role', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockOwnerProfile, error: null }),
          }),
        }),
      };
      (mockSupabaseClient.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom);

      const { result } = renderHook(() => useRole(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.hasPermission('owner')).toBe(true);
      expect(result.current.data?.hasPermission('manager')).toBe(true);
      expect(result.current.data?.hasPermission('staff')).toBe(true);
    });

    it('manager has permission for manager and staff roles but not owner', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockManagerProfile, error: null }),
          }),
        }),
      };
      (mockSupabaseClient.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom);

      const { result } = renderHook(() => useRole(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.hasPermission('owner')).toBe(false);
      expect(result.current.data?.hasPermission('manager')).toBe(true);
      expect(result.current.data?.hasPermission('staff')).toBe(true);
    });

    it('staff only has permission for staff role', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockStaffProfile, error: null }),
          }),
        }),
      };
      (mockSupabaseClient.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom);

      const { result } = renderHook(() => useRole(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.hasPermission('owner')).toBe(false);
      expect(result.current.data?.hasPermission('manager')).toBe(false);
      expect(result.current.data?.hasPermission('staff')).toBe(true);
    });
  });

  describe('3. No user / not authenticated', () => {
    it('returns null role when no user is authenticated', async () => {
      (mockSupabaseClient.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
      });

      const { result } = renderHook(() => useRole(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.role).toBeNull();
      expect(result.current.data?.isOwner).toBe(false);
      expect(result.current.data?.isManager).toBe(false);
      expect(result.current.data?.isStaff).toBe(false);
    });

    it('hasPermission returns false when no user', async () => {
      (mockSupabaseClient.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
      });

      const { result } = renderHook(() => useRole(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.hasPermission('owner')).toBe(false);
      expect(result.current.data?.hasPermission('manager')).toBe(false);
      expect(result.current.data?.hasPermission('staff')).toBe(false);
    });
  });

  describe('4. Error handling', () => {
    it('returns null role when profile fetch fails', async () => {
      (mockSupabaseClient.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });
      
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      };
      (mockSupabaseClient.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom);

      const { result } = renderHook(() => useRole(), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.role).toBeNull();
      expect(result.current.data?.isOwner).toBe(false);
      expect(result.current.data?.isManager).toBe(false);
      expect(result.current.data?.isStaff).toBe(false);
    });
  });

  describe('5. Query configuration', () => {
    it('staleTime is 5 minutes', async () => {
      (mockSupabaseClient.auth.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { user: null },
      });
      
      const mockFrom = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
      (mockSupabaseClient.from as ReturnType<typeof vi.fn>).mockReturnValue(mockFrom);

      const queryClient = createTestQueryClient();

      function customWrapper({ children }: { children: React.ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
      }

      const { result } = renderHook(() => useRole(), { wrapper: customWrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const queries = (queryClient as any).getQueryCache().getAll();
      const profileQuery = queries.find(
        (q: any) => JSON.stringify(q.queryKey) === JSON.stringify(['user-profile'])
      );
      /* eslint-enable @typescript-eslint/no-explicit-any */

      expect(profileQuery?.options?.staleTime).toBe(5 * 60 * 1000);
    });
  });
});
