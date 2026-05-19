// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useRealtimeOrders, useRealtimeConnection } from '@/hooks/useRealtimeOrders'
import type { OrderWithItems } from '@/application/services/adminOrderService'

// ── Mocks ─────────────────────────────────────────────────────

// Mock socket.io client
vi.mock('@/lib/socketio', () => ({
  getSocket: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  })),
  disconnectSocket: vi.fn(),
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// ── Test Setup ────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
  Wrapper.displayName = 'createWrapper'

  return Wrapper
}

// ── Test Data ────────────────────────────────────────────────

const mockOrders: OrderWithItems[] = [
  {
    id: 'order-1',
    restaurant_id: 'restaurant-123',
    customer_id: 'customer-1',
    status: 'pending' as const,
    payment_status: 'paid' as const,
    total: 100,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [
      {
        id: 'item-1',
        order_id: 'order-1',
        product_id: 'product-1',
        quantity: 2,
        unit_price: 50,
        notes: null,
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'order-2',
    restaurant_id: 'restaurant-123',
    customer_id: 'customer-2',
    status: 'confirmed' as const,
    payment_status: 'paid' as const,
    total: 75,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [],
  },
]

// ── Tests ─────────────────────────────────────────────────────

describe('useRealtimeOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Default fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ orders: mockOrders }),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('1. Initial state and enabled/disabled', () => {
    it('returns initial loading state', async () => {
      const { result } = renderHook(() => useRealtimeOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.orders).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('returns empty orders when enabled is false', async () => {
      const { result } = renderHook(
        () => useRealtimeOrders({ restaurantId: 'restaurant-123', enabled: false }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.orders).toEqual([])
      expect(result.current.isLoading).toBe(false)
    })

    it('returns empty orders when restaurantId is missing', async () => {
      const { result } = renderHook(() => useRealtimeOrders({ restaurantId: undefined }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.orders).toEqual([])
    })
  })

  describe('2. Fetch orders via API', () => {
    it('fetches orders from API endpoint', async () => {
      const { result } = renderHook(() => useRealtimeOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(mockFetch).toHaveBeenCalled()
      const callUrl = mockFetch.mock.calls[0][0]
      expect(callUrl).toContain('/api/admin/orders')
      expect(callUrl).toContain('restaurant_id=restaurant-123')
    })

    it('returns fetched orders', async () => {
      const { result } = renderHook(() => useRealtimeOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.orders).toEqual(mockOrders)
    })

    it('handles empty orders response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ orders: [] }),
      })

      const { result } = renderHook(() => useRealtimeOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.orders).toEqual([])
    })
  })

  describe('3. Polling fallback', () => {
    it('starts polling with default interval', async () => {
      renderHook(() => useRealtimeOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {})

      // Advance time by POLLING_INTERVAL (10000ms)
      await act(async () => {
        vi.advanceTimersByTime(10000)
      })

      // Should have called fetch again (refetch)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('uses custom polling interval when provided', async () => {
      renderHook(
        () => useRealtimeOrders({ restaurantId: 'restaurant-123', pollingInterval: 5000 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => {})

      // Advance time by 5000ms (custom interval)
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('4. Cleanup on unmount', () => {
    it('clears polling interval on unmount', async () => {
      const { unmount } = renderHook(() => useRealtimeOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {})

      // Should not throw on cleanup
      expect(() => unmount()).not.toThrow()
    })

    it('does not refetch after unmount', async () => {
      const { unmount } = renderHook(() => useRealtimeOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {})

      unmount()

      mockFetch.mockClear()

      await act(async () => {
        vi.advanceTimersByTime(15000)
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })

  describe('5. Refetch function', () => {
    it('provides refetch function', async () => {
      const { result } = renderHook(() => useRealtimeOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(typeof result.current.refetch).toBe('function')
    })

    it('refetch triggers API call', async () => {
      const { result } = renderHook(() => useRealtimeOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      mockFetch.mockClear()

      await act(async () => {
        result.current.refetch()
      })

      expect(mockFetch).toHaveBeenCalled()
    })
  })
})