import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

import { POST } from '@/app/api/cart/validate/route'

function makePostRequest(body: unknown) {
  return new NextRequest('http://localhost/api/cart/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/cart/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna válido=false para carrinho vazio', async () => {
    const body = { items: [], restaurantId: 'rest-1' }
    const req = makePostRequest(body)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.valid).toBe(false)
    expect(json.errors[0]).toContain('Carrinho vazio')
  })

  it('retorna 500 em erro inesperado (JSON inválido)', async () => {
    const req = new NextRequest('http://localhost/api/cart/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.errors).toContain('Erro interno do servidor')
  })
})