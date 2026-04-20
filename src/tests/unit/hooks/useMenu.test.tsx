import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useMenu } from '@/hooks/useMenu';
import type { MenuResponse } from '@/hooks/useMenu';

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

describe('useMenu hook', () => {
  const restaurantId = 'rest-123';
  const mockMenuResponse: MenuResponse = {
    restaurant: {
      id: 'rest-123',
      name: 'Restaurante Teste',
      slug: 'restaurante-teste',
    },
    categories: [
      {
        id: 'cat-1',
        name: 'Bebidas',
        restaurantId: 'rest-123',
        products: [
          { id: 'prod-1', name: 'Coca-Cola', price: 5.5, categoryId: 'cat-1' },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.spyOn(global, 'fetch');
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

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
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
  });

  describe('2. Error handling', () => {
    it('returns error state when fetch throws', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });

    it('returns error state when response is not ok', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ message: 'Restaurant not found' }),
      } as Response);

      const { result } = renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toContain('Restaurant not found');
    });
  });

  describe('3. Query key includes restaurantId', () => {
    it('fetch URL includes restaurantId in query string', async () => {
      (global.fetch as ReturnType<typeof vi.spyOn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMenuResponse,
      } as Response);

      renderHook(() => useMenu(restaurantId), { wrapper });

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      expect(global.fetch).toHaveBeenCalledWith('/api/menu?restaurant_id=rest-123');
    });
  });

  describe('4. Stale time configured', () => {
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

      const queries = (queryClient as any).getQueryCache().getAll();
      const menuQuery = queries.find(
        (q: any) => JSON.stringify(q.queryKey) === JSON.stringify(['menu', restaurantId])
      );

      expect(menuQuery?.options?.staleTime).toBe(5 * 60 * 1000);
    });
  });

  describe('5. Query behavior with invalid restaurantId', () => {
    it('fetch is called with null when restaurantId is null', async () => {
      const fetchSpy = global.fetch as ReturnType<typeof vi.spyOn>;

      renderHook(() => useMenu(null as any), { wrapper });

      await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

      // Currently hook does not validate; it calls fetch with restaurant_id=null
      expect(fetchSpy).toHaveBeenCalledWith('/api/menu?restaurant_id=null');
    });

    it('fetch is called with undefined when restaurantId is undefined', async () => {
      const fetchSpy = global.fetch as ReturnType<typeof vi.spyOn>;

      renderHook(() => useMenu(undefined as any), { wrapper });

      await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

      expect(fetchSpy).toHaveBeenCalledWith('/api/menu?restaurant_id=undefined');
    });

    it('fetch is called with empty string when restaurantId is empty', async () => {
      const fetchSpy = global.fetch as ReturnType<typeof vi.spyOn>;

      renderHook(() => useMenu(''), { wrapper });

      await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

      expect(fetchSpy).toHaveBeenCalledWith('/api/menu?restaurant_id=');
    });
  });
});
