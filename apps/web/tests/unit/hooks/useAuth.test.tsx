/**
 * Testes do hook useAuth — consolidação em arquivo único (.tsx).
 *
 * O hook usa lib/api-client (singleton mutado) para gerenciar tokens de acesso.
 * O tokenVersion no hook força recálculo reativo de isAuthenticated.
 *
 * Suites:
 *  1. Initial state and session check
 *  2. Sign in (sucesso, falha, exceções não-Error)
 *  3. Sign out (limpa state, redireciona, trata erro de API)
 *  4. Error handling on init (getMe throws, string não-Error)
 *  5. Sign up (sucesso, falha)
 *  6. Timeout/failure scenarios (initAuth com getMe rejeitado, getMe resolvendo null)
 */

import { renderHook, waitFor, act } from '@testing-library/react';
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

// Mock lib/api-client — interface atual do useAuth.
// ATENÇÃO: vi.mock é hoisted, então precisamos usar vi.fn() aqui dentro (não no escopo externo).
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
const isAuthenticated = apiClient.isAuthenticated as ReturnType<typeof vi.fn>;
const getMe = apiClient.getMe as ReturnType<typeof vi.fn>;
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
      restoreTokens.mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('isAuthenticated is false when no session exists', async () => {
      restoreTokens.mockReturnValue(false);
      isAuthenticated.mockReturnValue(false);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('isAuthenticated is true when valid session exists', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockResolvedValue(mockUser);
      isAuthenticated.mockReturnValue(true);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual({ user: mockUser });
    });

    it('error is null on successful initialization', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockResolvedValue(mockUser);
      isAuthenticated.mockReturnValue(true);

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
      restoreTokens.mockReturnValue(false);
      login.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('dono@restaurante.com', 'Senha@123');

      expect(login).toHaveBeenCalledWith('dono@restaurante.com', 'Senha@123');
    });

    it('signIn updates user and session on success', async () => {
      restoreTokens.mockReturnValue(false);
      isAuthenticated.mockReturnValue(true);
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
      restoreTokens.mockReturnValue(false);
      isAuthenticated.mockReturnValue(false);
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
      restoreTokens.mockReturnValue(false);
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
      restoreTokens.mockReturnValue(true);
      getMe.mockResolvedValue(mockUser);
      isAuthenticated.mockReturnValue(true);
      logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signOut();

      expect(logout).toHaveBeenCalledTimes(1);
    });

    it('signOut clears user and session', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockResolvedValue(mockUser);
      isAuthenticated.mockReturnValue(true);
      logout.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      isAuthenticated.mockReturnValue(false);

      await act(async () => {
        await result.current.signOut();
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
    });

    it('signOut redirects to /login', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockResolvedValue(mockUser);
      isAuthenticated.mockReturnValue(true);
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
      // Garante que o usuário sempre sai do app mesmo se /auth/logout falhar.
      restoreTokens.mockReturnValue(true);
      getMe.mockResolvedValue(mockUser);
      isAuthenticated.mockReturnValue(true);
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
    it('sets error when getMe throws', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('sets generic error when initAuth catches non-Error throw', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockRejectedValue('Network error string');

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
      restoreTokens.mockReturnValue(false);
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
      restoreTokens.mockReturnValue(false);
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

  // ── 6. Timeout/failure scenarios (initAuth edge cases) ─────────────────────

  describe('6. Init failure scenarios', () => {
    it('isLoading becomes false after getMe rejects', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('user and session are null after getMe rejects', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockRejectedValue(new Error('timeout'));

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
    });

    it('clears tokens when restored tokens yield null user (token expired)', async () => {
      restoreTokens.mockReturnValue(true);
      getMe.mockResolvedValue(null);

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(apiClient.clearTokens).toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });
});
