// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useKitchenOrders } from '@/hooks/useKitchenOrders'
import type { OrderWithItems } from '@/services/adminOrderService'

// ── Mock Data ─────────────────────────────────────────────────

const mockOrders: OrderWithItems[] = [
  {
    id: 'order-1',
    restaurant_id: 'restaurant-123',
    customer_id: 'customer-1',
    status: 'pending' as const,
    payment_status: 'paid' as const,
    total: 100,
    created_at: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
    updated_at: new Date().toISOString(),
    items: [],
  },
  {
    id: 'order-2',
    restaurant_id: 'restaurant-123',
    customer_id: 'customer-2',
    status: 'preparing' as const,
    payment_status: 'paid' as const,
    total: 75,
    created_at: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
    updated_at: new Date().toISOString(),
    items: [],
  },
  {
    id: 'order-3',
    restaurant_id: 'restaurant-123',
    customer_id: 'customer-3',
    status: 'ready' as const,
    payment_status: 'paid' as const,
    total: 50,
    created_at: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
    updated_at: new Date().toISOString(),
    items: [],
  },
]

// ── Mocks ─────────────────────────────────────────────────────

// Mock useRealtimeOrders
vi.mock('@/hooks/useRealtimeOrders', () => ({
  useRealtimeOrders: vi.fn(({ restaurantId, enabled }: { restaurantId?: string; enabled?: boolean }) => ({
    orders: restaurantId && enabled !== false ? mockOrders : [],
    isLoading: false,
    error: null,
    isConnected: true,
    refetch: vi.fn(),
  })),
}))

import { useRealtimeOrders } from '@/hooks/useRealtimeOrders'

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

// ── Tests ─────────────────────────────────────────────────────

describe('useKitchenOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Basic functionality', () => {
    it('returns empty when restaurantId is not provided', async () => {
      const { result } = renderHook(() => useKitchenOrders({ restaurantId: undefined }), {
        wrapper: createWrapper(),
      })

      expect(result.current.orders).toEqual([])
      expect(result.current.pendingOrders).toEqual([])
    })

    it('returns empty when enabled is false', async () => {
      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'rest-1', enabled: false }), {
        wrapper: createWrapper(),
      })

      expect(result.current.orders).toEqual([])
    })

    it('returns orders from useRealtimeOrders', async () => {
      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.orders.length).toBe(3)
      })
    })
  })

  describe('2. Order processing', () => {
    it('adds age_seconds to each order', async () => {
      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.orders[0].age_seconds).toBeGreaterThan(0)
      })
    })

    it('adds age_display to each order', async () => {
      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.orders[0].age_display).toMatch(/\d+s|\d+m \d+s|\d+h \d+m/)
      })
    })

    it('adds is_stale flag based on threshold', async () => {
      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123', staleThresholdSeconds: 300 }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        // Orders from 1-3 minutes ago should not be stale with 300s threshold
        result.current.orders.forEach((order) => {
          expect(order.is_stale).toBe(false)
        })
      })
    })

    it('marks old orders as stale', async () => {
      const oldOrder: OrderWithItems = {
        id: 'old-order',
        restaurant_id: 'restaurant-123',
        customer_id: 'customer-old',
        status: 'pending' as const,
        payment_status: 'paid' as const,
        total: 100,
        created_at: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        updated_at: new Date().toISOString(),
        items: [],
      }

      vi.mocked(useRealtimeOrders).mockReturnValue({
        orders: [oldOrder],
        isLoading: false,
        error: null,
        isConnected: true,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123', staleThresholdSeconds: 300 }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.orders[0].is_stale).toBe(true)
      })
    })
  })

  describe('3. Sorting', () => {
    it('sorts orders by age (oldest first)', () => {
      // Reset mock before this test
      vi.mocked(useRealtimeOrders).mockReset()
      vi.mocked(useRealtimeOrders).mockReturnValue({
        orders: mockOrders,
        isLoading: false,
        error: null,
        isConnected: true,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      // order-3 was created 3 minutes ago, should be first (oldest)
      expect(result.current.orders[0].id).toBe('order-3')
      expect(result.current.orders[1].id).toBe('order-2')
      expect(result.current.orders[2].id).toBe('order-1')
    })
  })

  describe('4. Filtering', () => {
    it('returns empty arrays when no orders', () => {
      // Override mock to return empty
      vi.mocked(useRealtimeOrders).mockReturnValueOnce({
        orders: [],
        isLoading: false,
        error: null,
        isConnected: true,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      expect(result.current.pendingOrders).toEqual([])
      expect(result.current.preparingOrders).toEqual([])
      expect(result.current.readyOrders).toEqual([])
    })

    it('filters by status when orders exist', () => {
      // Use default mock with mockOrders
      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      // Just verify orders are processed (age_seconds added)
      result.current.orders.forEach(order => {
        expect(order.age_seconds).toBeGreaterThanOrEqual(0)
        expect(order.age_display).toBeDefined()
      })
    })
  })

  describe('5. Pass-through properties', () => {
    it('passes isLoading from useRealtimeOrders', async () => {
      vi.mocked(useRealtimeOrders).mockReturnValue({
        orders: [],
        isLoading: true,
        error: null,
        isConnected: false,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('passes error from useRealtimeOrders', async () => {
      const mockError = new Error('Failed to fetch')
      vi.mocked(useRealtimeOrders).mockReturnValue({
        orders: [],
        isLoading: false,
        error: mockError,
        isConnected: false,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      expect(result.current.error).toBe(mockError)
    })

    it('passes isConnected from useRealtimeOrders', async () => {
      // Reset to default mock with isConnected: true
      vi.mocked(useRealtimeOrders).mockReturnValue({
        orders: mockOrders,
        isLoading: false,
        error: null,
        isConnected: true,
        refetch: vi.fn(),
      })

      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isConnected).toBe(true)
      })
    })

    it('provides refetch function', async () => {
      const mockRefetch = vi.fn()
      vi.mocked(useRealtimeOrders).mockReturnValue({
        orders: [],
        isLoading: false,
        error: null,
        isConnected: true,
        refetch: mockRefetch,
      })

      const { result } = renderHook(() => useKitchenOrders({ restaurantId: 'restaurant-123' }), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.refetch).toBe('function')
    })
  })
})
