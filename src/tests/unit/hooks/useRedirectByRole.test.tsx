import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRedirectByRole } from '@/hooks/useRedirectByRole';

// Mock next/navigation
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

// Helper para criar mock de fetch para /api/auth/profile
function createFetchMock(role: string, restaurantId: string | null, ok = true) {
  return vi.fn(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve({ role, restaurant_id: restaurantId }),
    })
  );
}

// Helper para criar mock de erro
function createErrorFetchMock() {
  return vi.fn(() =>
    Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Profile not found' }),
    })
  );
}

describe('useRedirectByRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sem userId', () => {
    it('deve retornar /menu e role null quando userId é null', () => {
      const { result } = renderHook(() => useRedirectByRole(null, false));

      expect(result.current.destination).toBe('/menu');
      expect(result.current.role).toBeNull();
    });

    it('deve retornar /menu e role null quando userId é undefined', () => {
      const { result } = renderHook(() => useRedirectByRole(undefined as unknown as null, false));

      expect(result.current.destination).toBe('/menu');
      expect(result.current.role).toBeNull();
    });
  });

  describe('com userId - perfil do usuário', () => {
    it('role dono sem restaurant_id deve direcionar para /admin/restaurants/new', async () => {
      const mockFetch = createFetchMock('dono', null);
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useRedirectByRole('user-123', true));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.role).toBe('dono');
      expect(result.current.destination).toBe('/admin/restaurants/new');
    });

    it('role dono com restaurant_id deve direcionar para /admin/dashboard', async () => {
      const mockFetch = createFetchMock('dono', 'rest-123');
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useRedirectByRole('user-123', true));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.role).toBe('dono');
      expect(result.current.destination).toBe('/admin/dashboard');
    });

    it('role cliente deve direcionar para /menu', async () => {
      const mockFetch = createFetchMock('cliente', null);
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useRedirectByRole('user-123', true));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.role).toBe('cliente');
      expect(result.current.destination).toBe('/menu');
    });

    it('role gerente deve direcionar para /admin/dashboard', async () => {
      const mockFetch = createFetchMock('gerente', 'rest-456');
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useRedirectByRole('user-123', true));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.role).toBe('gerente');
      expect(result.current.destination).toBe('/admin/dashboard');
    });

    it('role atendente deve direcionar para /admin/dashboard', async () => {
      const mockFetch = createFetchMock('atendente', 'rest-789');
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useRedirectByRole('user-123', true));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.role).toBe('atendente');
      expect(result.current.destination).toBe('/admin/dashboard');
    });

    it('deve retornar /menu quando há erro na API', async () => {
      const mockFetch = createErrorFetchMock();
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useRedirectByRole('user-123', true));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.destination).toBe('/menu');
      expect(result.current.role).toBeNull();
    });

    it('deve retornar /menu quando profile não existe', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        })
      );
      vi.stubGlobal('fetch', mockFetch);

      const { result } = renderHook(() => useRedirectByRole('user-123', true));

      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.destination).toBe('/menu');
      expect(result.current.role).toBeNull();
    });
  });
});
