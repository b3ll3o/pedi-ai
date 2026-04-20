import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRealtimeOrders } from '@/hooks/useRealtimeOrders'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: vi.fn() },
    from: vi.fn(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
  }),
}))

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useRealtimeOrders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches orders on mount', async () => {
    const mockOrders = [
      { id: '1', status: 'pending', total: 100 },
      { id: '2', status: 'confirmed', total: 200 },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ orders: mockOrders }),
    })

    const { result } = renderHook(
      () => useRealtimeOrders({ restaurantId: 'rest-123', enabled: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.orders).toEqual(mockOrders)
    expect(result.current.error).toBeNull()
  })

  it('handles fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed' }),
    })

    const { result } = renderHook(
      () => useRealtimeOrders({ restaurantId: 'rest-123', enabled: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.orders).toEqual([])
  })

  it('does not fetch when disabled', async () => {
    const { result } = renderHook(
      () => useRealtimeOrders({ restaurantId: 'rest-123', enabled: false }),
      { wrapper }
    )

    expect(result.current.orders).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('does not fetch when restaurantId is empty', async () => {
    const { result } = renderHook(
      () => useRealtimeOrders({ restaurantId: '', enabled: true }),
      { wrapper }
    )

    expect(result.current.orders).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('refetch function works', async () => {
    const mockOrders = [{ id: '1', status: 'pending', total: 100 }]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: mockOrders }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ orders: [] }),
      })

    const { result } = renderHook(
      () => useRealtimeOrders({ restaurantId: 'rest-123', enabled: true }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.orders.length).toBe(1)

    await result.current.refetch()

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })
})
