import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockGetSession = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabase/middleware', () => ({
  createClient: vi.fn().mockResolvedValue({
    supabase: {
      auth: {
        getSession: mockGetSession,
        getUser: mockGetUser,
      },
    },
    supabaseResponse: NextResponse.next(),
  }),
}))

describe('proxy (middleware)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function createMockRequest(url: string) {
    return {
      nextUrl: {
        pathname: new URL(url).pathname,
        startsWith: (str: string) => new URL(url).pathname.startsWith(str),
        searchParams: new URL(url).searchParams,
      },
      url,
      cookies: {
        get: () => undefined,
        getAll: () => [],
      },
      headers: new Headers(),
       
    } as any
  }

  it('deve redirecionar para /admin/login quando sem sessão em rota admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('http://localhost/admin/dashboard')

    const response = await proxy(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toContain('/admin/login')
  })

  it('deve permitir request autenticado em rota admin', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('http://localhost/admin/dashboard')

    const response = await proxy(request)

    expect(response).toBeInstanceOf(NextResponse)

    expect((response as any).status).toBe(200)
  })

  it('não deve interceptar rotas não-admin', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { proxy } = await import('@/proxy')
    const request = createMockRequest('http://localhost/cardapio')

    const response = await proxy(request)

    expect(response).toBeInstanceOf(NextResponse)

    expect((response as any).status).toBe(200)
  })
})
