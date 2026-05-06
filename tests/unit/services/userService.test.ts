import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getUsers,
  getUser,
  inviteUser,
  updateUser,
  deleteUser,
  canManageRole,
  getRoleLabel,
  getRoleColor,
} from '@/services/userService'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUsers', () => {
    it('fetches users successfully', async () => {
      const mockUsers = [
        { id: '1', name: 'Dono', email: 'dono@test.com', role: 'dono' },
        { id: '2', name: 'Atendente', email: 'atendente@test.com', role: 'atendente' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ users: mockUsers }),
      })

      const result = await getUsers('restaurant-123')

      expect(result).toEqual(mockUsers)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users?restaurant_id=restaurant-123'
      )
    })

    it('throws error on failed fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch' }),
      })

      await expect(getUsers('restaurant-123')).rejects.toThrow('Failed to fetch')
    })

    it('throws error when json parsing fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(getUsers('restaurant-123')).rejects.toThrow('Failed to fetch users')
    })

    it('throws error when response ok but json returns empty object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      })

      await expect(getUsers('restaurant-123')).rejects.toThrow('Failed to fetch users')
    })
  })

  describe('getUser', () => {
    it('fetches single user successfully', async () => {
      const mockUser = { id: '1', name: 'Dono', email: 'dono@test.com', role: 'dono' }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUser }),
      })

      const result = await getUser('1')

      expect(result).toEqual(mockUser)
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1')
    })

    it('throws error on failed fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch user' }),
      })

      await expect(getUser('1')).rejects.toThrow('Failed to fetch user')
    })

    it('throws error when json parsing fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(getUser('1')).rejects.toThrow('Failed to fetch user')
    })

    it('throws error when response ok but json returns empty object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      })

      await expect(getUser('1')).rejects.toThrow('Failed to fetch user')
    })
  })

  describe('inviteUser', () => {
    it('invites user successfully', async () => {
      const input = {
        restaurant_id: 'rest-1',
        email: 'new@test.com',
        name: 'New User',
        role: 'atendente' as const,
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invitation: { id: 'inv-1', ...input } }),
      })

      const result = await inviteUser(input)

      expect(result.invitation.email).toBe('new@test.com')
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    })

    it('throws error on duplicate email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: 'User already exists' }),
      })

      await expect(
        inviteUser({
          restaurant_id: 'rest-1',
          email: 'existing@test.com',
          name: 'Existing',
          role: 'atendente',
        })
      ).rejects.toThrow('User already exists')
    })

    it('throws error when json parsing fails on invite', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(
        inviteUser({
          restaurant_id: 'rest-1',
          email: 'test@test.com',
          name: 'Test',
          role: 'atendente',
        })
      ).rejects.toThrow('Failed to invite user')
    })

    it('throws error when response ok but json returns empty object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      })

      await expect(
        inviteUser({
          restaurant_id: 'rest-1',
          email: 'test@test.com',
          name: 'Test',
          role: 'atendente',
        })
      ).rejects.toThrow('Failed to invite user')
    })
  })

  describe('updateUser', () => {
    it('updates user successfully', async () => {
      const updates = { name: 'Updated Name', role: 'gerente' as const }
      const mockUpdated = { id: '1', ...updates }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: mockUpdated }),
      })

      const result = await updateUser('1', updates)

      expect(result.name).toBe('Updated Name')
      expect(result.role).toBe('gerente')
    })

    it('throws error on failed update', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to update user' }),
      })

      await expect(updateUser('1', { name: 'New' })).rejects.toThrow('Failed to update user')
    })

    it('throws error when json parsing fails on update', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(updateUser('1', { name: 'New' })).rejects.toThrow('Failed to update user')
    })

    it('throws error when response ok but json returns empty object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      })

      await expect(updateUser('1', { name: 'New' })).rejects.toThrow('Failed to update user')
    })
  })

  describe('deleteUser', () => {
    it('deletes user successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      await expect(deleteUser('1')).resolves.not.toThrow()
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/users/1', {
        method: 'DELETE',
      })
    })

    it('throws error when deleting last owner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Cannot delete the last owner' }),
      })

      await expect(deleteUser('1')).rejects.toThrow('Cannot delete the last owner')
    })

    it('throws error when json parsing fails on delete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(deleteUser('1')).rejects.toThrow('Failed to delete user')
    })

    it('throws error when response ok but json returns empty object', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      })

      await expect(deleteUser('1')).rejects.toThrow('Failed to delete user')
    })
  })

  describe('canManageRole', () => {
    it('dono can manage all roles', () => {
      expect(canManageRole('dono', 'atendente')).toBe(true)
      expect(canManageRole('dono', 'gerente')).toBe(true)
      expect(canManageRole('dono', 'dono')).toBe(false) // Cannot manage self at same level
    })

    it('gerente can manage staff but not dono', () => {
      expect(canManageRole('gerente', 'atendente')).toBe(true)
      expect(canManageRole('gerente', 'dono')).toBe(false)
      expect(canManageRole('gerente', 'gerente')).toBe(false)
    })

    it('atendente cannot manage anyone', () => {
      expect(canManageRole('atendente', 'atendente')).toBe(false)
      expect(canManageRole('atendente', 'gerente')).toBe(false)
      expect(canManageRole('atendente', 'dono')).toBe(false)
    })
  })

  describe('getRoleLabel', () => {
    it('returns correct labels', () => {
      expect(getRoleLabel('dono')).toBe('Proprietário')
      expect(getRoleLabel('gerente')).toBe('Gerente')
      expect(getRoleLabel('atendente')).toBe('Funcionário')
    })

    it('returns role itself for unknown role', () => {
       
      expect(getRoleLabel('unknown' as any)).toBe('unknown')
    })
  })

  describe('getRoleColor', () => {
    it('returns correct colors', () => {
      expect(getRoleColor('dono')).toBe('#dc2626')
      expect(getRoleColor('gerente')).toBe('#d97706')
      expect(getRoleColor('atendente')).toBe('#2563eb')
    })

    it('returns default color for unknown role', () => {
       
      expect(getRoleColor('unknown' as any)).toBe('#6b7280')
    })
  })
})
