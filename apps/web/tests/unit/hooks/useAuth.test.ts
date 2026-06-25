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
const clearTokens = apiClient.clearTokens as ReturnType<typeof vi.fn>;
const isAuthenticated = apiClient.isAuthenticated as ReturnType<typeof vi.fn>;
const getMe = apiClient.getMe as ReturnType<typeof vi.fn>;
const login = apiClient.login as ReturnType<typeof vi.fn>;
const register = apiClient.register as ReturnType<typeof vi.fn>;
const logout = apiClient.logout as ReturnType<typeof vi.fn>;

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

  describe('2. Sign in', () => {
    it('signIn calls login with correct params', async () => {
      restoreTokens.mockReturnValue(false);
      login.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('admin@test.com', 'password123');

      expect(login).toHaveBeenCalledWith('admin@test.com', 'password123');
    });

    it('signIn updates user and session on success', async () => {
      restoreTokens.mockReturnValue(false);
      isAuthenticated.mockReturnValue(true);
      login.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await result.current.signIn('admin@test.com', 'password123');

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
        await expect(result.current.signIn('admin@test.com', 'wrongpassword')).rejects.toThrow(
          'Invalid credentials'
        );
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
        await expect(result.current.signIn('admin@test.com', 'password123')).rejects.toThrow();
      });

      expect(result.current.error).toBe('Falha na autenticação');
    });
  });

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

      await result.current.signOut();

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

      await result.current.signOut();

      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

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

  describe('5. Sign up', () => {
    it('signUp calls register with correct params and updates state on success', async () => {
      restoreTokens.mockReturnValue(false);
      register.mockResolvedValue({ user: mockUser });

      const { result } = renderHook(() => useAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp('test@test.com', 'password123', 'Test User');
      });

      expect(register).toHaveBeenCalledWith('test@test.com', 'password123', 'Test User');
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
          result.current.signUp('test@test.com', 'password123', 'Test User')
        ).rejects.toThrow('Email already in use');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Email already in use');
      });
    });
  });
});
