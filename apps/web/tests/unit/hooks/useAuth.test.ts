import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useAuth } from '@/hooks/useAuth';
import { login, logout, getSession } from '@/lib/auth/client';

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

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Initial state and session check', () => {
    it('isLoading is true initially', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });

    it('isAuthenticated is false when no session exists', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

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

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('2. Sign in', () => {
    it('signIn calls login with correct params', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (login as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('admin@test.com', 'password123');

      expect(login).toHaveBeenCalledWith('admin@test.com', 'password123');
    });

    it('signIn updates user and session on success', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (login as ReturnType<typeof vi.fn>).mockResolvedValue({ error: undefined });

      // Mock getSession to return session after login
      let sessionCallCount = 0;
      (getSession as ReturnType<typeof vi.fn>).mockImplementation(() => {
        sessionCallCount++;
        return sessionCallCount > 1 ? Promise.resolve(mockSession) : Promise.resolve(null);
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
      (login as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.signIn('admin@test.com', 'wrongpassword')).rejects.toThrow(
          'Invalid credentials'
        );
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid credentials');
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('signIn sets generic error when login throws non-Error exception', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (login as ReturnType<typeof vi.fn>).mockRejectedValue('Network failure');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.signIn('admin@test.com', 'password123')).rejects.toThrow();
      });

      expect(result.current.error).toBe('Falha na autenticação');
    });
  });

  describe('3. Sign out', () => {
    it('signOut calls logout', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signOut();

      expect(logout).toHaveBeenCalledTimes(1);
    });

    it('signOut clears user and session', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

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

    it('signOut redirects to /login', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession);
      (logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      mockPush.mockClear();

      await result.current.signOut();

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('4. Error handling on init', () => {
    it('sets error when getSession throws', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('sets generic error when initAuth catches non-Error throw', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockRejectedValue('Network error string');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Falha ao inicializar autenticação');
    });
  });

  describe('5. Sign up (not implemented)', () => {
    it('signUp sets error when not implemented', async () => {
      (getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('test@test.com', 'password123');
      });

      expect(result.current.error).toBe('Registro não implementado');
    });
  });
});
