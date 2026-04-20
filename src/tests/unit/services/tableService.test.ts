import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  generateTableQR,
} from '@/services/tableService'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('tableService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTables', () => {
    it('fetches tables successfully', async () => {
      const mockTables = [
        { id: '1', number: 1, name: 'Mesa 1', capacity: 4, active: true },
        { id: '2', number: 2, name: 'Mesa 2', capacity: 6, active: true },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tables: mockTables }),
      })

      const result = await getTables('restaurant-123')

      expect(result).toEqual(mockTables)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/tables?restaurant_id=restaurant-123'
      )
    })

    it('throws error on failed fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch' }),
      })

      await expect(getTables('restaurant-123')).rejects.toThrow('Failed to fetch')
    })
  })

  describe('getTable', () => {
    it('fetches single table successfully', async () => {
      const mockTable = { id: '1', number: 1, name: 'Mesa 1', active: true }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ table: mockTable }),
      })

      const result = await getTable('1')

      expect(result).toEqual(mockTable)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/tables/1')
    })

    it('throws error when table not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Table not found' }),
      })

      await expect(getTable('nonexistent')).rejects.toThrow('Table not found')
    })
  })

  describe('createTable', () => {
    it('creates table successfully', async () => {
      const input = { restaurant_id: 'rest-1', number: 3, name: 'Terraço' }
      const mockCreated = { id: '3', ...input, capacity: null, active: true }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ table: mockCreated }),
      })

      const result = await createTable(input)

      expect(result).toEqual(mockCreated)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    })

    it('throws error on conflict', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Table number already exists' }),
      })

      await expect(createTable({ restaurant_id: 'rest-1', number: 1 })).rejects.toThrow(
        'Table number already exists'
      )
    })
  })

  describe('updateTable', () => {
    it('updates table successfully', async () => {
      const updates = { name: 'Varanda', capacity: 8 }
      const mockUpdated = { id: '1', number: 1, ...updates, active: true }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ table: mockUpdated }),
      })

      const result = await updateTable('1', updates)

      expect(result).toEqual(mockUpdated)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/tables/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
    })
  })

  describe('deleteTable', () => {
    it('deletes table successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      await expect(deleteTable('1')).resolves.not.toThrow()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/tables/1', {
        method: 'DELETE',
      })
    })

    it('throws error on active orders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'Cannot delete table with active orders' }),
      })

      await expect(deleteTable('1')).rejects.toThrow('Cannot delete table with active orders')
    })
  })

  describe('generateTableQR', () => {
    it('generates QR code successfully', async () => {
      const mockQRData = {
        table_id: '1',
        table_number: 1,
        table_name: 'Mesa 1',
        qr_payload: {
          restaurant_id: 'rest-1',
          table_id: '1',
          timestamp: Date.now(),
          signature: 'abc123',
        },
        qr_data: '{"restaurant_id":"rest-1","table_id":"1"}',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQRData),
      })

      const result = await generateTableQR('1')

      expect(result.table_id).toBe('1')
      expect(result.qr_payload.signature).toBeDefined()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/tables/1/qr')
    })
  })
})
