import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useTable } from '@/hooks/useTable'
import type { QRPayload } from '@/lib/qr/validator'

// ── Mocks ─────────────────────────────────────────────────────

// Mock useTableStore
vi.mock('@/stores/tableStore', () => ({
  useTableStore: vi.fn(() => ({
    restaurantId: null,
    tableId: null,
    tableName: null,
    setTable: vi.fn(),
    clearTable: vi.fn(),
  })),
}))

import { useTableStore } from '@/stores/tableStore'

// Mock fetch
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

const mockQRPayload: QRPayload = {
  restaurant_id: 'rest-123',
  table_id: 'table-5',
  timestamp: Date.now(),
  signature: 'valid-signature',
}

// ── Tests ─────────────────────────────────────────────────────

describe('useTable', () => {
  const mockSetTable = vi.fn()
  const mockClearTable = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useTableStore).mockReturnValue({
      restaurantId: null,
      tableId: null,
      tableName: null,
      setTable: mockSetTable,
      clearTable: mockClearTable,
    })
  })

  describe('1. Initial state', () => {
    it('returns null values when no table is set', async () => {
      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      expect(result.current.table.restaurantId).toBeNull()
      expect(result.current.table.tableId).toBeNull()
      expect(result.current.table.tableName).toBeNull()
      expect(result.current.table.isValid).toBe(false)
    })

    it('returns isValid=true when all table info is present', async () => {
      vi.mocked(useTableStore).mockReturnValue({
        restaurantId: 'rest-123',
        tableId: 'table-5',
        tableName: 'Mesa 5',
        setTable: mockSetTable,
        clearTable: mockClearTable,
      })

      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      expect(result.current.table.isValid).toBe(true)
      expect(result.current.table.restaurantId).toBe('rest-123')
    })
  })

  describe('2. setTable', () => {
    it('exposes setTable from store', async () => {
      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.setTable).toBe('function')
    })
  })

  describe('3. clearTable', () => {
    it('exposes clearTable from store', async () => {
      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.clearTable).toBe('function')
    })
  })

  describe('4. validateTable', () => {
    it('returns true when QR validation succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          table: { id: 'table-5', name: 'Mesa 5', number: 5 },
        }),
      })

      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      let validateResult: boolean | undefined
      await act(async () => {
        validateResult = await result.current.validateTable(mockQRPayload)
      })

      expect(validateResult).toBe(true)
    })

    it('returns false when QR validation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: false,
          error: 'Invalid QR code',
        }),
      })

      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      let validateResult: boolean | undefined
      await act(async () => {
        validateResult = await result.current.validateTable(mockQRPayload)
      })

      expect(validateResult).toBe(false)
    })

    it('returns false when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      let validateResult: boolean | undefined
      await act(async () => {
        validateResult = await result.current.validateTable(mockQRPayload)
      })

      expect(validateResult).toBe(false)
    })

    it('returns false when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request' }),
      })

      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      let validateResult: boolean | undefined
      await act(async () => {
        validateResult = await result.current.validateTable(mockQRPayload)
      })

      expect(validateResult).toBe(false)
    })

    it('calls setTable on successful validation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: true,
          table: { id: 'table-5', name: 'Mesa 5', number: 5 },
        }),
      })

      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.validateTable(mockQRPayload)
      })

      // setTable should be called via onSuccess
      await waitFor(() => {
        expect(mockSetTable).toHaveBeenCalledWith('rest-123', 'table-5', 'Mesa 5')
      })
    })

    it('does not call setTable when validation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          valid: false,
          error: 'Invalid QR',
        }),
      })

      const { result } = renderHook(() => useTable(), {
        wrapper: createWrapper(),
      })

      await act(async () => {
        await result.current.validateTable(mockQRPayload)
      })

      expect(mockSetTable).not.toHaveBeenCalled()
    })
  })
})
