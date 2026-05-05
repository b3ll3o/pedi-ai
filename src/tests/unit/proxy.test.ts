import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({
      status: 200,
      type: 'next',
    })),
    redirect: vi.fn((url: URL) => ({
      status: 302,
      type: 'redirect',
      url: url.toString(),
    })),
  },
}))

// Mock supabase middleware
const mockGetSession = vi.fn()
const mockGetUser = vi.fn()
vi.mock('@/lib/supabase/middleware', () => ({
  createClient: vi.fn(() => ({
    supabase: {
      auth: {
        getSession: mockGetSession,
        getUser: mockGetUser,
      },
    },
  })),
}))

describe('proxy', () => {
  const createMockRequest = (pathname: string): NextRequest => {
    const url = new URL(`http://localhost${pathname}`)
    return {
      nextUrl: {
        pathname,
      },
      url: url.toString(),
    } as unknown as NextRequest
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sem sessão', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
      })
    })

    it('deve redirecionar para /admin/login quando acessar rota admin', async () => {
      const { proxy } = await import('@/proxy')
      const request = createMockRequest('/admin/dashboard')

      const _response = await proxy(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(redirectCall.toString()).toContain('admin/login')
      expect(redirectCall.toString()).toContain('redirectTo=')
    })

    it('deve retornar NextResponse.next() quando acessar /admin/login (não redireciona)', async () => {
      const { proxy } = await import('@/proxy')
      const request = createMockRequest('/admin/login')

      const _response = await proxy(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('deve redirecionar para /login quando acessar rota de menu', async () => {
      const { proxy } = await import('@/proxy')
      const request = createMockRequest('/menu/123')

      const _response = await proxy(request)

      expect(NextResponse.redirect).toHaveBeenCalled()
      const redirectCall = (NextResponse.redirect as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(redirectCall.toString()).toContain('redirectTo=')
    })
  })

  describe('com sessão válida', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({
        data: {
          user: { id: 'user-123' },
        },
      })
    })

    it('deve retornar NextResponse.next() para rota admin', async () => {
      const { proxy } = await import('@/proxy')
      const request = createMockRequest('/admin/dashboard')

      const _response = await proxy(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('deve retornar NextResponse.next() para rota de menu', async () => {
      const { proxy } = await import('@/proxy')
      const request = createMockRequest('/menu/456')

      const _response = await proxy(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('deve retornar NextResponse.next() para rota não protegida', async () => {
      const { proxy } = await import('@/proxy')
      const request = createMockRequest('/outro/caminho')

      const _response = await proxy(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })
  })
})
