import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useAuth } from '@/hooks/useAuth';
import type { Session, User } from '@supabase/supabase-js';

// Mock the auth functions - must use hoisted factory
vi.mock('@/lib/supabase/auth', () => {
  const mockUnsubscribe = vi.fn();
  return {
    signIn: vi.fn<() => Promise<unknown>>(),
    signOut: vi.fn<() => Promise<void>>(),
    getSession: vi.fn<() => Promise<Session | null>>(),
    getUser: vi.fn<() => Promise<User | null>>(),
    onAuthStateChange: vi.fn(() => ({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    })),
    _mockUnsubscribe: mockUnsubscribe,
  };
});

// Mock AutenticarUsuarioUseCase
const { mockExecute } = vi.hoisted(() => ({
  mockExecute: vi.fn()
}));

vi.mock('@/application/autenticacao/services/AutenticarUsuarioUseCase', () => {
  function MockAutenticarUsuarioUseCase() {
    return { execute: mockExecute };
  }
  return {
    AutenticarUsuarioUseCase: vi.fn(MockAutenticarUsuarioUseCase),
  };
});

export { mockExecute };

// Mock RegistrarUsuarioUseCase
vi.mock('@/application/autenticacao/services/RegistrarUsuarioUseCase', () => {
  function MockRegistrarUsuarioUseCase() {
    return { execute: vi.fn() };
  }
  return {
    RegistrarUsuarioUseCase: vi.fn(MockRegistrarUsuarioUseCase),
  };
});

// Mock useRouter
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

export { mockPush };

import { getSession, getUser, _mockUnsubscribe } from '@/lib/supabase/auth';

const mockUser: User = {
  id: 'user-123',
  email: 'admin@test.com',
  role: 'authenticated',
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { name: 'Admin User' },
} as User;

const mockSession: Session = {
  access_token: 'access-token-123',
  refresh_token: 'refresh-token-123',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: mockUser,
} as Session;

describe('useAuth timeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('timeout behavior', () => {
    it('isLoading becomes false after timeout when getSession is slow', async () => {
      // Mock getSession to resolve after 10 seconds (slower than 5s timeout)
      (getSession as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSession), 10000))
      );
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);

      // Advance time past the 5s AUTH_INIT_TIMEOUT_MS
      await act(async () => {
        vi.advanceTimersByTimeAsync(5500);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('isAuthenticated is false after timeout', async () => {
      // Promise that never resolves
      (getSession as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );
      (getUser as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        vi.advanceTimersByTimeAsync(5500);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('component does not stay in infinite loading after timeout', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );
      (getUser as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        vi.advanceTimersByTimeAsync(6000);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('user and session are null after timeout', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );
      (getUser as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise(() => {})
      );

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        vi.advanceTimersByTimeAsync(5500);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('successful auth completes before timeout', async () => {
      vi.useRealTimers(); // Need real timers for this test

      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('auth fails fast with error, isLoading becomes false', async () => {
      vi.useRealTimers();

      (getSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });
});
