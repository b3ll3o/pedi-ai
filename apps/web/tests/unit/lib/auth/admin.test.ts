import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth, requireRole, getRestaurantId } from '@/lib/auth/admin'

// Store mock functions in module scope so we can configure them in tests
type MockInstance<T extends (...args: never[]) => unknown> = ReturnType<typeof vi.fn<T>>
let mockCookiesGetAll: MockInstance<() => { name: string; value: string }[]> = vi.fn(() => [])
let mockCookiesSet: MockInstance<(...args: unknown[]) => void> = vi.fn()
let mockCookiesSetAll: MockInstance<(...args: unknown[]) => void> = vi.fn()
let mockGetSession: MockInstance<() => Promise<{ data: { session: { user: unknown } | null }; error: unknown }>> = vi.fn(() =>
  Promise.resolve({ data: { session: null }, error: null })
)
let mockAdminSingle: MockInstance<() => Promise<{ data: unknown; error: unknown }>> = vi.fn()

// Mock modules before importing the function under test
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: (...args: unknown[]) => mockCookiesGetAll(...args),
    set: (...args: unknown[]) => mockCookiesSet(...args),
    setAll: (...args: unknown[]) => mockCookiesSetAll(...args),
  })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: (...args: unknown[]) => mockAdminSingle(...args),
  })),
}))

describe('admin auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock implementations to defaults
    mockCookiesGetAll = vi.fn(() => [])
    mockCookiesSet = vi.fn()
    mockCookiesSetAll = vi.fn()
    mockGetSession = vi.fn(() => Promise.resolve({ data: { session: null }, error: null }))
    mockAdminSingle = vi.fn()
  })

  describe('requireAuth', () => {
    it('deve retornar AuthUser quando sessão válida', async () => {
      mockGetSession = vi.fn(() =>
        Promise.resolve({
          data: { session: { user: { id: 'user-123', email: 'owner@restaurante.com' } } },
          error: null,
        })
      )

      mockAdminSingle = vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'user-123',
            email: 'owner@restaurante.com',
            role: 'dono',
            restaurant_id: 'rest-456',
          },
          error: null,
        })
      )

      const user = await requireAuth()

      expect(user).toEqual({
        id: 'user-123',
        email: 'owner@restaurante.com',
        role: 'dono',
        restaurant_id: 'rest-456',
      })
    })

    it('deve lançar erro quando sem sessão', async () => {
      mockGetSession = vi.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      )

      await expect(requireAuth()).rejects.toThrow('Não autenticado')
    })

    it('deve lançar erro quando usuário não encontrado no banco', async () => {
      mockGetSession = vi.fn(() =>
        Promise.resolve({
          data: { session: { user: { id: 'user-123', email: 'test@test.com' } } },
          error: null,
        })
      )

      mockAdminSingle = vi.fn(() =>
        Promise.resolve({ data: null, error: { message: 'Not found' } })
      )

      await expect(requireAuth()).rejects.toThrow('Usuário não encontrado')
    })
  })

  describe('requireRole', () => {
    it('deve permitir usuário com role autorizada', () => {
      const user = { id: '1', email: 'a@b.com', role: 'dono' as const, restaurant_id: 'r1' }
      expect(() => requireRole(user, ['dono', 'gerente'])).not.toThrow()
    })

    it('deve lançar erro 403 para role não autorizada', () => {
      const user = { id: '1', email: 'a@b.com', role: 'atendente' as const, restaurant_id: 'r1' }
      expect(() => requireRole(user, ['dono', 'gerente'])).toThrow()
      try {
        requireRole(user, ['dono', 'gerente'])
       
      } catch (e: any) {
        expect(e.status).toBe(403)
      }
    })
  })

  describe('getRestaurantId', () => {
    it('deve retornar restaurant_id do usuário', () => {
      const user = { id: '1', email: 'a@b.com', role: 'dono' as const, restaurant_id: 'rest-123' }
      expect(getRestaurantId(user)).toBe('rest-123')
    })
  })
})
