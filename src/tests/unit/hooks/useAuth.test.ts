import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import React from 'react';

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

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
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

import { signIn, signOut, getSession, getUser, onAuthStateChange } from '@/lib/supabase/auth';
import { _mockUnsubscribe } from '@/lib/supabase/auth';

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
  token_type: 'Bearer',
  user: mockUser,
} as Session;

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _mockUnsubscribe.mockClear();
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

      unmount();

      expect(_mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Sign in', () => {
    it('signIn calls supabase signIn with correct params', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (signIn as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      } as AuthResponse);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('admin@test.com', 'password123');

      expect(signIn).toHaveBeenCalledWith('admin@test.com', 'password123');
    });

    it('signIn updates user and session on success', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (signIn as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: mockSession, user: mockUser },
        error: null,
      } as AuthResponse);

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
      (signIn as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { session: null, user: null },
        error: { message: 'Invalid credentials', status: 400 },
      } as AuthResponse);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('admin@test.com', 'wrongpassword');

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid credentials');
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('isLoading is true during signIn', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      let resolveSignIn: (value: AuthResponse) => void;
      const signInPromise = new Promise<AuthResponse>((resolve) => {
        resolveSignIn = resolve;
      });
      (signIn as ReturnType<typeof vi.fn>).mockReturnValue(signInPromise);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Use act to flush state updates synchronously
      await act(async () => {
        result.current.signIn('admin@test.com', 'password123');
      });

      // Hook should be loading during signIn (since signIn mock never resolves in this test)
      expect(result.current.isLoading).toBe(true);

      resolveSignIn!({
        data: { session: mockSession, user: mockUser },
        error: null,
      } as AuthResponse);
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
});
