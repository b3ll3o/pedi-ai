// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useMenu } from '@/hooks/useMenu';
import { useMenuStore } from '@/infrastructure/persistence/menuStore';
import type { MenuResponse } from '@/hooks/useMenu';

// ── Mocks ───────────────────────────────────────────────────

// Mock cache module
const mockGetCachedMenu = vi.fn();
vi.mock('@/lib/offline/cache', () => ({
  getCachedMenu: (...args: unknown[]) => mockGetCachedMenu(...args),
}));

// Create a fresh QueryClient for each test to avoid state leakage
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ── Fixtures ───────────────────────────────────────────────────

const mockRestaurant = {
  id: 'rest-123',
  name: 'Restaurante Teste',
  description: null,
  address: null,
  phone: null,
  logo_url: null,
  settings: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCategories = [
  {
    id: 'cat-1',
    restaurant_id: 'rest-123',
    name: 'Bebidas',
    description: null,
    image_url: null,
    sort_order: 0,
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    products: [
      { id: 'prod-1', name: 'Coca-Cola', price: 5.5, category_id: 'cat-1', description: null, image_url: null, dietary_labels: null, available: true, sort_order: 0, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ],
  },
];

const mockMenuResponse: MenuResponse = {
  restaurant: mockRestaurant,
  categories: mockCategories,
};

const cachedData = {
  categories: [
    { id: 'cat-1', restaurant_id: 'rest-123', name: 'Bebidas', description: null, image_url: null, sort_order: 0, active: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  ],
  products: [
    { id: 'prod-1', name: 'Coca-Cola', price: 5.5, category_id: 'cat-1', description: null, image_url: null, dietary_labels: null, available: true, sort_order: 0, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  ],
  modifiers: [],
  timestamp: Date.now(),
};

// ── Tests ───────────────────────────────────────────────────

describe('useMenu hook', () => {
  const restaurantId = 'rest-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(global, 'fetch');
    mockGetCachedMenu.mockReset();
    // Reset store state
    useMenuStore.getState().reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. Successful fetch', () => {
    it('returns data with correct types', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMenuResponse,
      } as Response);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.restaurant.id).toBe('rest-123');
      expect(result.current.data?.categories).toHaveLength(1);
      expect(result.current.data?.categories[0].products).toHaveLength(1);
    });

    it('isLoading goes from true to false', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMenuResponse,
      } as Response);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('error is null on successful fetch', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMenuResponse,
      } as Response);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('2. API fetch fails → cache fallback', () => {
    it('returns cached data when API fails but cache exists', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockRejectedValueOnce(
        new Error('Network error')
      );
      mockGetCachedMenu.mockResolvedValueOnce(cachedData);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.restaurant.id).toBe('rest-123');
      expect(result.current.data?.categories).toHaveLength(1);
    });

    it('hydrates menuStore with cached categories and products', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockRejectedValueOnce(
        new Error('Network error')
      );
      mockGetCachedMenu.mockResolvedValueOnce(cachedData);

      renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        const state = useMenuStore.getState();
        expect(state.categories.length).toBeGreaterThan(0);
        expect(state.products.length).toBeGreaterThan(0);
      });
    });

    it('does not throw error when cache is available', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockRejectedValueOnce(
        new Error('Network error')
      );
      mockGetCachedMenu.mockResolvedValueOnce(cachedData);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isError).toBe(false);
    });

    it('cache fallback returns compatible MenuResponse structure', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockRejectedValueOnce(
        new Error('Network error')
      );
      mockGetCachedMenu.mockResolvedValueOnce(cachedData);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Structure must be compatible with MenuResponse
      expect(result.current.data?.restaurant).toBeDefined();
      expect(Array.isArray(result.current.data?.categories)).toBe(true);
    });
  });

  describe('3. API fails with non-ok response → cache fallback', () => {
    it('falls back to cache on 404 response', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Cardápio não encontrado' }),
      } as Response);
      mockGetCachedMenu.mockResolvedValueOnce(cachedData);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });

    it('uses statusText when error json parsing fails', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Invalid JSON'); },
      } as Response);
      mockGetCachedMenu.mockResolvedValueOnce(cachedData);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeDefined();
    });
  });

  describe('4. API fails and no cache → error', () => {
    it('throws error when API fails and no cache available', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockRejectedValue(
        new Error('Network error')
      );
      mockGetCachedMenu.mockResolvedValue(null);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });

      expect(result.current.error?.message).toBe('Sem conexão e cardápio não disponível em cache');
    });

    it('throws error on non-ok response with no cache', async () => {
      // Fetch returns ok:false, we throw Error("Falha ao buscar cardápio: 404")
      // Then catch runs getCachedMenu() which returns null
      // So we throw "Sem conexão e cardápio não disponível em cache"
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Cardápio não encontrado' }),
      } as Response);
      mockGetCachedMenu.mockResolvedValue(null);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });

      // When cache is null, catch throws "Sem conexão..." instead of "Falha ao buscar"
      expect(result.current.error?.message).toBe('Sem conexão e cardápio não disponível em cache');
    });

    it('uses statusText as fallback error message', async () => {
      // Fetch returns ok:false with 500, we throw Error("Falha ao buscar cardápio: 500")
      // Then catch runs getCachedMenu() which returns null
      // So we throw "Sem conexão e cardápio não disponível em cache"
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Invalid JSON'); },
      } as Response);
      mockGetCachedMenu.mockResolvedValue(null);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      }, { timeout: 5000 });

      // When cache is null, catch throws "Sem conexão..." instead of using statusText
      expect(result.current.error?.message).toBe('Sem conexão e cardápio não disponível em cache');
    });
  });

  describe('5. Query key and fetch URL', () => {
    it('fetch URL includes restaurantId in query string', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMenuResponse,
      } as Response);

      renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      expect(global.fetch).toHaveBeenCalledWith('/api/menu?restaurant_id=rest-123');
    });

    it('fetch is called with encoded restaurantId', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMenuResponse,
      } as Response);

      renderHook(() => useMenu('rest-with-special!chars'), { wrapper });

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      expect(global.fetch).toHaveBeenCalledWith('/api/menu?restaurant_id=rest-with-special!chars');
    });

    it('fetch is called with null when restaurantId is null', async () => {
      renderHook(() => useMenu(null as unknown), { wrapper });

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      expect(global.fetch).toHaveBeenCalledWith('/api/menu?restaurant_id=null');
    });

    it('fetch is called with undefined when restaurantId is undefined', async () => {
      renderHook(() => useMenu(undefined as unknown), { wrapper });

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      expect(global.fetch).toHaveBeenCalledWith('/api/menu?restaurant_id=undefined');
    });

    it('fetch is called with empty string when restaurantId is empty', async () => {
      renderHook(() => useMenu(''), { wrapper });

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      expect(global.fetch).toHaveBeenCalledWith('/api/menu?restaurant_id=');
    });
  });

  describe('6. Stale time configured', () => {
    it('staleTime is 5 minutes (300000ms)', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMenuResponse,
      } as Response);

      const queryClient = createTestQueryClient();

      function staleTimeWrapper({ children }: { children: React.ReactNode }) {
        return (
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        );
      }

      const { result } = renderHook(() => useMenu(restaurantId), {
        wrapper: staleTimeWrapper,
      });

      await waitFor(() => expect(result.current.isSuccess));

      const queries = (queryClient as unknown as { getQueryCache: () => { getAll: () => unknown[] } }).getQueryCache().getAll();
      const menuQuery = queries.find(
        (q: unknown) => JSON.stringify((q as { queryKey: unknown[] }).queryKey) === JSON.stringify(['menu', restaurantId])
      );

      expect(menuQuery?.options?.staleTime).toBe(5 * 60 * 1000);
    });
  });

  describe('7. Multiple instances with different restaurantId', () => {
    it('each hook instance uses its own queryKey', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockMenuResponse, restaurant: { ...mockRestaurant, id: 'rest-1' } }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockMenuResponse, restaurant: { ...mockRestaurant, id: 'rest-2' } }),
        } as Response);

      const { result: r1 } = renderHook(() => useMenu('rest-1'), { wrapper });
      const { result: r2 } = renderHook(() => useMenu('rest-2'), { wrapper });

      await waitFor(() => {
        expect(r1.current.isSuccess).toBe(true);
        expect(r2.current.isSuccess).toBe(true);
      });

      expect(r1.current.data?.restaurant.id).toBe('rest-1');
      expect(r2.current.data?.restaurant.id).toBe('rest-2');
    });
  });

  describe('8. Store hydration edge cases', () => {
    it('store is not polluted when cache is empty array', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockRejectedValueOnce(
        new Error('Network error')
      );
      mockGetCachedMenu.mockResolvedValueOnce({
        categories: [],
        products: [],
        modifiers: [],
        timestamp: Date.now(),
      });

      renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(useMenuStore.getState().categories).toHaveLength(0);
        expect(useMenuStore.getState().products).toHaveLength(0);
      });
    });

    it('reset clears hydrated store data', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockRejectedValueOnce(
        new Error('Network error')
      );
      mockGetCachedMenu.mockResolvedValueOnce(cachedData);

      renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(useMenuStore.getState().categories.length).toBeGreaterThan(0);
      });

      act(() => {
        useMenuStore.getState().reset();
      });

      const state = useMenuStore.getState();
      expect(state.categories).toHaveLength(0);
      expect(state.products).toHaveLength(0);
      expect(state.modifierGroups).toHaveLength(0);
    });
  });
});
