import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockGetSession = vi.fn()

vi.mock('@/lib/supabase/middleware', () => ({
  createClient: vi.fn().mockResolvedValue({
    supabase: {
      auth: {
        getSession: mockGetSession,
      },
    },
    supabaseResponse: NextResponse.next(),
  }),
}))

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createMockRequest(url: string) {
    return {
      nextUrl: {
        pathname: new URL(url).pathname,
        startsWith: (str: string) => new URL(url).pathname.startsWith(str),
      },
      url,
      cookies: {
        get: () => undefined,
        getAll: () => [],
      },
      headers: new Headers(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  }

  it('deve redirecionar para /admin/login quando sem sessão em rota admin', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('http://localhost/admin/dashboard')

    const response = await middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/admin/login')
  })

  it('deve permitir request autenticado em rota admin', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { user: { id: 'user-1' } },
      },
    })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('http://localhost/admin/dashboard')

    const response = await middleware(request)

    expect(response).toBeInstanceOf(NextResponse)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((response as any).status).toBe(200)
  })

  it('não deve interceptar rotas não-admin', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('http://localhost/cardapio')

    const response = await middleware(request)

    expect(response).toBeInstanceOf(NextResponse)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((response as any).status).toBe(200)
  })
})
