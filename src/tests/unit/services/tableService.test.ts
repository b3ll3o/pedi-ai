import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  generateTableQR,
  validateTableQR,
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

    it('handles malformed error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(getTables('restaurant-123')).rejects.toThrow('Failed to fetch tables')
    })

    it('handles json parsing failure on error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(getTables('restaurant-123')).rejects.toThrow('Failed to fetch tables')
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

    it('throws fallback error when response.json() throws on getTable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(getTable('nonexistent')).rejects.toThrow('Failed to fetch table')
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

    it('throws fallback error when response.json() throws', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(createTable({ restaurant_id: 'rest-1', number: 1 })).rejects.toThrow(
        'Failed to create table'
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

    it('throws error on update failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Table not found' }),
      })

      await expect(updateTable('nonexistent', { name: 'Test' })).rejects.toThrow('Table not found')
    })

    it('throws fallback error when response.json() throws', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(updateTable('1', { name: 'Test' })).rejects.toThrow('Failed to update table')
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

    it('throws error on network failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Network error' }),
      })

      await expect(deleteTable('1')).rejects.toThrow('Network error')
    })

    it('handles json parsing failure on delete error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(deleteTable('1')).rejects.toThrow('Failed to delete table')
    })

    it('handles malformed error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(deleteTable('1')).rejects.toThrow('Failed to delete table')
    })

    it('handles network failure with ok=false but json parsing succeeds', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' }),
      })

      await expect(deleteTable('1')).rejects.toThrow('Server error')
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

    it('throws error when QR generation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Failed to generate QR code' }),
      })

      await expect(generateTableQR('1')).rejects.toThrow('Failed to generate QR code')
    })

    it('throws fallback error when response.json() throws on QR generation', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(generateTableQR('1')).rejects.toThrow('Failed to generate QR code')
    })
  })

  describe('validateTableQR', () => {
    it('returns true for valid QR code', async () => {
      const timestamp = Date.now()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      })

      const result = await validateTableQR('rest-1', 'table-1', timestamp, 'signature123')

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/tables/table-1/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: 'rest-1',
          table_id: 'table-1',
          timestamp,
          signature: 'signature123',
        }),
      })
    })

    it('returns false for invalid QR code', async () => {
      const timestamp = Date.now()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ valid: false }),
      })

      const result = await validateTableQR('rest-1', 'table-1', timestamp, 'invalid-sig')

      expect(result).toBe(false)
    })

    it('returns false when fetch fails', async () => {
      const timestamp = Date.now()
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid request' }),
      })

      const result = await validateTableQR('rest-1', 'table-1', timestamp, 'bad-sig')

      expect(result).toBe(false)
    })

    it('returns false when response ok but valid is not strictly true', async () => {
      const timestamp = Date.now()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        json: () => Promise.resolve({ valid: 'yes' as any }), // truthy but not === true
      })

      const result = await validateTableQR('rest-1', 'table-1', timestamp, 'sig')

      expect(result).toBe(false)
    })

    it('returns false when json parsing fails after ok response', async () => {
      const timestamp = Date.now()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      const result = await validateTableQR('rest-1', 'table-1', timestamp, 'sig')

      expect(result).toBe(false)
    })
  })
})
