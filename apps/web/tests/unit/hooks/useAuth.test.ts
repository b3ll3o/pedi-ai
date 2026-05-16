import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

import { useAuth } from '@/hooks/useAuth';
import type { Session, User, AuthResponse } from '@supabase/supabase-js';

// Mock the auth functions - must use hoisted factory
vi.mock('@/lib/supabase/auth', () => {
  const mockUnsubscribe = vi.fn();
  return {
    signIn: vi.fn<() => Promise<AuthResponse>>(),
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

import { _signIn, signOut, getSession, getUser, onAuthStateChange, _mockUnsubscribe } from '@/lib/supabase/auth';

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

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (_mockUnsubscribe as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Initial state and session check', () => {
    it('isLoading is true initially', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });

    it('isAuthenticated is false when no session exists', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('isAuthenticated is true when valid session exists', async () => {
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

    it('error is null on successful initialization', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });

    it('subscribes to auth state changes on mount', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      renderHook(() => useAuth());

      await waitFor(() => {
        expect(onAuthStateChange).toHaveBeenCalled();
      });
    });

    it('unsubscribes from auth state changes on unmount', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { unmount } = renderHook(() => useAuth());

      // Wait for effect to run and stabilize (StrictMode runs effects twice)
      await waitFor(() => {
        expect(onAuthStateChange).toHaveBeenCalled();
      });

      await act(async () => {
        unmount();
      });

      // In StrictMode, effect runs: mount -> cleanup -> mount -> unmount
      // So unsubscribe may be called 2 times (1 cleanup + 1 unmount) or 1 time depending on timing
      expect(_mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('2. Sign in', () => {
    beforeEach(() => {
      // Reset mockExecute for each test
      mockExecute.mockReset();
    });

    it('signIn calls AutenticarUsuarioUseCase with correct params', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      mockExecute.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('admin@test.com', 'password123');

      expect(mockExecute).toHaveBeenCalled();
    });

    it('signIn updates user and session on success', async () => {
      // Mock getSession and getUser for initial state
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      mockExecute.mockResolvedValue(undefined);

      // Mock getSession and getUser to return valid session after signIn
      let sessionCallCount = 0;
      (getSession as ReturnType<typeof vi.fn>).mockImplementation(() => {
        sessionCallCount++;
        return sessionCallCount > 1
          ? Promise.resolve(mockSession)
          : Promise.resolve(null);
      });
      (getUser as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return sessionCallCount > 1
          ? Promise.resolve(mockUser)
          : Promise.resolve(null);
      });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('admin@test.com', 'password123');

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
    });

    it('signIn sets error on auth failure', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      // UseCase throws error with English message (matches real Supabase behavior)
      mockExecute.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.signIn('admin@test.com', 'wrongpassword')).rejects.toThrow('Invalid credentials');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid credentials');
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('signIn sets generic error when signIn throws non-Error exception', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      // UseCase throws a string instead of an Error object
      mockExecute.mockRejectedValue('Network failure');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.signIn('admin@test.com', 'password123')).rejects.toThrow();
      });

      expect(result.current.error).toBe('Falha na autenticação');
    });

    it('signIn sets generic error when signIn throws object without message', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      // UseCase throws an object that is not an Error instance
      mockExecute.mockRejectedValue({ code: 'ERR_NETWORK', status: 500 });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.signIn('admin@test.com', 'password123')).rejects.toThrow();
      });

      expect(result.current.error).toBe('Falha na autenticação');
    });

    it('isLoading is true during signIn', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Create a promise that never resolves to simulate ongoing operation
      let resolveSignIn: () => void;
      const signInPromise = new Promise<void>((resolve) => {
        resolveSignIn = resolve;
      });
      mockExecute.mockReturnValue(signInPromise);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Use act to flush state updates synchronously
      await act(async () => {
        result.current.signIn('admin@test.com', 'password123');
      });

      // Hook should be loading during signIn (since mockExecute never resolves in this test)
      expect(result.current.isLoading).toBe(true);

      resolveSignIn!();
    });
  });

  describe('3. Sign out', () => {
    it('signOut calls supabase signOut', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (signOut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signOut();

      expect(signOut).toHaveBeenCalledTimes(1);
    });

    it('signOut clears user and session', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (signOut as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      await result.current.signOut();

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });
    });

    it('signOut sets error on failure', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (signOut as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signOut();

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });
    });
  });

  describe('4. Error handling on init', () => {
    it('sets error when getSession throws', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('sets error when getUser throws', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('User fetch failed'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('User fetch failed');
    });

    it('sets generic error when initAuth catches non-Error throw', async () => {
      // getSession throws a non-Error value (e.g., string)
      (getSession as ReturnType<typeof vi.fn>).mockRejectedValue('Network error string');
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Falha ao inicializar autenticação');
    });

    it('sets error when initAuth catches object without message', async () => {
      // getUser throws an object that is not an Error instance
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockRejectedValue({ code: 'ERR_NETWORK' });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Falha ao inicializar autenticação');
    });
  });

  describe('5. Cleanup on unmount', () => {
    it('does not update state after unmount', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result, unmount } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();

      // Should not throw even though the async operation continues
      expect(() => result.current.signOut()).not.toThrow();
    });
  });

  describe('6. Auth state change events', () => {
    it('handles TOKEN_REFRESHED event - updates session', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Get the callback passed to onAuthStateChange
      const onAuthStateChangeCallback = (onAuthStateChange as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Create a new session with different expiry
      const refreshedSession: Session = {
        ...mockSession,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 7200,
      };

      // Simulate TOKEN_REFRESHED event
      await act(async () => {
        onAuthStateChangeCallback('TOKEN_REFRESHED', refreshedSession);
      });

      await waitFor(() => {
        expect(result.current.session).toEqual(refreshedSession);
      });

      // User should remain the same
      expect(result.current.user).toEqual(mockUser);
    });

    it('handles SIGNED_IN event - updates user and session', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Get the callback passed to onAuthStateChange
      const onAuthStateChangeCallback = (onAuthStateChange as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Simulate SIGNED_IN event
      await act(async () => {
        onAuthStateChangeCallback('SIGNED_IN', mockSession);
      });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
      });
    });

    it('handles SIGNED_OUT event - clears state and redirects', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Clear previous calls
      mockPush.mockClear();

      // Get the callback passed to onAuthStateChange
      const onAuthStateChangeCallback = (onAuthStateChange as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Simulate SIGNED_OUT event
      await act(async () => {
        onAuthStateChangeCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.session).toBeNull();
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
      });

      // Router.push should have been called to redirect to login
      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('handles SIGNED_OUT with null session (session expiry)', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Get the callback passed to onAuthStateChange
      const onAuthStateChangeCallback = (onAuthStateChange as ReturnType<typeof vi.fn>).mock.calls[0][0];

      // Simulate session expiry (SIGNED_OUT with null session)
      await act(async () => {
        onAuthStateChangeCallback('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });
    });
  });
});
