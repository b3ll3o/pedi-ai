// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mock createClient ───────────────────────────────────────────
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

import { GET, POST } from '@/app/api/orders/route'

function makeRequest(method: 'GET' | 'POST', url: string, body?: unknown) {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return new NextRequest(url, init)
}

describe('GET /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retorna 400 quando falta customer_id', async () => {
    const req = makeRequest('GET', 'http://localhost/api/orders?restaurant_id=rest-1')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('customer_id')
  })

  it('retorna 400 quando falta restaurant_id', async () => {
    const req = makeRequest('GET', 'http://localhost/api/orders?customer_id=cust-1')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('restaurant_id')
  })
})

describe('POST /api/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validBody = {
    customer_id: 'cust-1',
    items: [{ product_id: 'prod-1', quantity: 2, unit_price: 25, modifiers: [] }],
    payment_method: 'pix',
    idempotency_key: 'idem-1',
  }

  it('retorna 400 quando falta customer_id', async () => {
    const body = { ...validBody, customer_id: '' }
    const req = makeRequest('POST', 'http://localhost/api/orders', body)
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando falta items', async () => {
    const body = { ...validBody, items: [] }
    const req = makeRequest('POST', 'http://localhost/api/orders', body)
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('retorna 400 quando payment_method inválido', async () => {
    const body = { ...validBody, payment_method: 'bitcoin' }
    const req = makeRequest('POST', 'http://localhost/api/orders', body)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('payment_method')
  })

  it('retorna 400 quando falta idempotency_key', async () => {
    const body = { ...validBody, idempotency_key: '' }
    const req = makeRequest('POST', 'http://localhost/api/orders', body)
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('idempotency_key')
  })

  it('retorna 500 em erro inesperado (JSON inválido)', async () => {
    const req = new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal server error')
  })
})
