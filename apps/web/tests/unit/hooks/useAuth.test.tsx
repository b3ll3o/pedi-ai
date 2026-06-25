import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';

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

// Mock lib/api-client — interface atual do useAuth
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    restoreTokens: vi.fn<() => boolean>(),
    clearTokens: vi.fn<() => void>(),
    isAuthenticated: vi.fn<() => boolean>(),
    getMe: vi.fn<() => Promise<unknown | null>>(),
    login: vi.fn<() => Promise<{ user: unknown }>>(),
    register: vi.fn<() => Promise<{ user: unknown }>>(),
    logout: vi.fn<() => Promise<void>>(),
  },
}));

const restoreTokens = apiClient.restoreTokens as ReturnType<typeof vi.fn>;
const getMe = apiClient.getMe as ReturnType<typeof vi.fn>;

const mockUser = {
  id: 'user-123',
  email: 'admin@test.com',
  role: 'admin',
  restaurantId: 'restaurant-123',
};

describe('useAuth timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('timeout behavior', () => {
    it('isLoading becomes false after getMe fails', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('isAuthenticated is false after getMe fails', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('user and session are null after getMe fails', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('successful auth completes successfully', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockResolvedValue(mockUser);
      (apiClient.isAuthenticated as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual({ user: mockUser });
    });

    it('auth fails fast with error, isLoading becomes false', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });
});
