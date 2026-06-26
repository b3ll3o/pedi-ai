/**
 * Testes do hook useAuth — consolidação em arquivo único (.tsx).
 *
 * No novo modelo HttpOnly-cookie, o hook:
 *  - chama `apiClient.verifySession()` (que faz GET /auth/me via cookie) no mount
 *  - em sucesso, popula user; em falha, user=null
 *  - signIn/signUp populam user após chamada ao servidor (servidor define cookie)
 *  - signOut limpa user e chama /auth/logout (servidor limpa cookie)
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';

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
    events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    verifySession: vi.fn<() => Promise<unknown | null>>(),
    getMe: vi.fn<() => Promise<unknown | null>>(),
    login: vi.fn<() => Promise<{ user: unknown }>>(),
    register: vi.fn<() => Promise<{ user: unknown }>>(),
    logout: vi.fn<() => Promise<void>>(),
    clearUser: vi.fn<() => void>(),
  },
}));

const verifySession = apiClient.verifySession as ReturnType<typeof vi.fn>;
const login = apiClient.login as ReturnType<typeof vi.fn>;
const register = apiClient.register as ReturnType<typeof vi.fn>;
const logout = apiClient.logout as ReturnType<typeof vi.fn>;

export { mockPush };

const mockUser = {
  id: 'user-123',
  email: 'dono@restaurante.com',
  role: 'dono',
  restaurantId: 'restaurant-123',
  name: 'Dono Teste',
};

describe('useAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Initial state and session check ─────────────────────────────────────

  describe('1. Initial state and session check', () => {
    it('isLoading becomes false after init completes when no session', async () => {
      verifySession.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('isAuthenticated is true when valid session exists', async () => {
      verifySession.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual({ user: mockUser });
    });

    it('error is null on successful initialization', async () => {
      verifySession.mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ── 2. Sign in ─────────────────────────────────────────────────────────────

  describe('2. Sign in', () => {
    it('signIn calls login with correct params', async () => {
      verifySession.mockResolvedValue(null);
      login.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('dono@restaurante.com', 'Senha@123');

      expect(login).toHaveBeenCalledWith('dono@restaurante.com', 'Senha@123');
    });

    it('signIn updates user and session on success', async () => {
      verifySession.mockResolvedValue(null);
      login.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('dono@restaurante.com', 'Senha@123');

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.session).toEqual({ user: mockUser });
    });

    it('signIn sets error on auth failure', async () => {
      verifySession.mockResolvedValue(null);
      login.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(
          result.current.signIn('dono@restaurante.com', 'wrongpassword')
        ).rejects.toThrow('Invalid credentials');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Invalid credentials');
      });

      expect(result.current.user).toBeNull();
    });

    it('signIn sets generic error when login throws non-Error exception', async () => {
      verifySession.mockResolvedValue(null);
      login.mockRejectedValue('Network failure');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.signIn('dono@restaurante.com', 'Senha@123')).rejects.toThrow();
      });

      expect(result.current.error).toBe('Falha na autenticação');
    });
  });

  // ── 3. Sign out ────────────────────────────────────────────────────────────

  describe('3. Sign out', () => {
    it('signOut calls logout', async () => {
      verifySession.mockResolvedValue(mockUser);
      logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await result.current.signOut();

      expect(logout).toHaveBeenCalledTimes(1);
    });

    it('signOut clears user and session', async () => {
      verifySession.mockResolvedValue(mockUser);
      logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      await act(async () => {
        await result.current.signOut();
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
    });

    it('signOut redirects to /login', async () => {
      verifySession.mockResolvedValue(mockUser);
      logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      mockPush.mockClear();

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('signOut clears state and redirects even if logout API fails', async () => {
      verifySession.mockResolvedValue(mockUser);
      logout.mockRejectedValue(new Error('Network error during logout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      mockPush.mockClear();

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockPush).toHaveBeenCalledWith('/login');
      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
      expect(result.current.error).toBe('Network error during logout');
    });
  });

  // ── 4. Error handling on init ──────────────────────────────────────────────

  describe('4. Error handling on init', () => {
    it('sets error when verifySession throws', async () => {
      verifySession.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('sets generic error when initAuth catches non-Error throw', async () => {
      verifySession.mockRejectedValue('Network error string');

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Falha ao inicializar autenticação');
    });
  });

  // ── 5. Sign up ─────────────────────────────────────────────────────────────

  describe('5. Sign up', () => {
    it('signUp calls register with correct params and updates state on success', async () => {
      verifySession.mockResolvedValue(null);
      register.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('dono@restaurante.com', 'Senha@123', 'Dono Teste');
      });

      expect(register).toHaveBeenCalledWith('dono@restaurante.com', 'Senha@123', 'Dono Teste');
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });
    });

    it('signUp sets error when register throws', async () => {
      verifySession.mockResolvedValue(null);
      register.mockRejectedValue(new Error('Email already in use'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(
          result.current.signUp('dono@restaurante.com', 'Senha@123', 'Dono')
        ).rejects.toThrow('Email already in use');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Email already in use');
      });
    });
  });

  // ── 6. Init failure scenarios ──────────────────────────────────────────────

  describe('6. Init failure scenarios', () => {
    it('isLoading becomes false after verifySession rejects', async () => {
      verifySession.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('user and session are null after verifySession rejects', async () => {
      verifySession.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('user and session are null when verifySession returns null (cookie missing/expired)', async () => {
      verifySession.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });
  });
});
