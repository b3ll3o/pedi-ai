import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'
import * as authModule from '@/lib/supabase/auth'
import * as clientModule from '@/lib/supabase/client'

vi.mock('@/lib/supabase/auth')
vi.mock('@/lib/supabase/client')

const mockGetSession = vi.mocked(authModule.getSession)
const mockCreateClient = vi.mocked(clientModule.createClient)

describe('admin auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('requireAuth', () => {
    it('deve retornar AuthUser quando sessão válida', async () => {
      const mockSession = {
        user: { id: 'user-123', email: 'owner@restaurante.com' },
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetSession.mockResolvedValue(mockSession as any)

      const mockSupabaseClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'user-123',
            email: 'owner@restaurante.com',
            role: 'owner',
            restaurant_id: 'rest-456',
          },
          error: null,
        }),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreateClient.mockReturnValue(mockSupabaseClient as any)

      const user = await requireAuth()

      expect(user).toEqual({
        id: 'user-123',
        email: 'owner@restaurante.com',
        role: 'owner',
        restaurant_id: 'rest-456',
      })
      expect(mockGetSession).toHaveBeenCalledOnce()
    })

    it('deve lançar erro quando sem sessão', async () => {
      mockGetSession.mockResolvedValue(null)

      await expect(requireAuth()).rejects.toThrow('Não autenticado')
    })

    it('deve lançar erro quando usuário não encontrado no banco', async () => {
      mockGetSession.mockResolvedValue({
        user: { id: 'user-123', email: 'test@test.com' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)

      const mockSupabaseClient = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreateClient.mockReturnValue(mockSupabaseClient as any)

      await expect(requireAuth()).rejects.toThrow('Usuário não encontrado')
    })
  })

  describe('requireRole', () => {
    it('deve permitir usuário com role autorizada', () => {
      const user = { id: '1', email: 'a@b.com', role: 'owner' as const, restaurant_id: 'r1' }
      expect(() => requireRole(user, ['owner', 'manager'])).not.toThrow()
    })

    it('deve lançar erro 403 para role não autorizada', () => {
      const user = { id: '1', email: 'a@b.com', role: 'staff' as const, restaurant_id: 'r1' }
      expect(() => requireRole(user, ['owner', 'manager'])).toThrow()
      try {
        requireRole(user, ['owner', 'manager'])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        expect(e.status).toBe(403)
      }
    })
  })

  describe('getRestaurantId', () => {
    it('deve retornar restaurant_id do usuário', () => {
      const user = { id: '1', email: 'a@b.com', role: 'owner' as const, restaurant_id: 'rest-123' }
      expect(getRestaurantId(user)).toBe('rest-123')
    })
  })
})
