import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useAuth } from '@/hooks/useAuth';
import { getSession } from '@/lib/auth/client';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    locale: 'pt-BR',
    locales: ['pt-BR'],
    defaultLocale: 'pt-BR',
    isReady: true,
    isPreview: false,
    isFallback: false,
    basePath: '',
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock lib/auth/client
vi.mock('@/lib/auth/client', () => ({
  login: vi.fn<() => Promise<{ error?: string }>>(),
  logout: vi.fn<() => Promise<void>>(),
  getSession: vi.fn<
    () => Promise<{
      user?: { id: string; email: string; role: string; restaurantId?: string };
    } | null>
  >(),
  requestPasswordReset: vi.fn<() => Promise<{ error?: string }>>(),
}));

export { mockPush };

const mockUser = {
  id: 'user-123',
  email: 'admin@test.com',
  role: 'admin',
  restaurantId: 'restaurant-123',
};

const mockSession = {
  user: mockUser,
  token: '',
};

describe('useAuth timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('timeout behavior', () => {
    it('isLoading becomes false after getSession fails', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('isAuthenticated is false after getSession fails', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('user and session are null after getSession fails', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('successful auth completes successfully', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('auth fails fast with error, isLoading becomes false', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });
});
