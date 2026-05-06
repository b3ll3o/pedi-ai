import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getOrders,
  getOrder,
  getOrderStatus,
  updateOrderStatus,
  isValidStatusTransition,
  getAllowedTransitions,
  getOrderAge,
  getOrderAgeDisplay,
  isOrderStale,
  VALID_STATUS_TRANSITIONS,
  type OrderFilters,
  type OrderWithItems,
} from '@/services/adminOrderService'

// ── Mock fetch ──────────────────────────────────────────────────────

interface MockFetchState {
  calls: Array<{ url: string; options: RequestInit }>
  responses: Array<{
    ok: boolean
    status?: number
    json: () => Promise<unknown>
    statusText?: string
  }>
}

const mockFetchState: MockFetchState = {
  calls: [],
  responses: [],
}

function setupFetch() {
  mockFetchState.calls = []
  mockFetchState.responses = []
}

function mockNextResponse(response: {
  ok: boolean
  status?: number
  json: () => Promise<unknown>
  statusText?: string
}) {
  mockFetchState.responses.push(response)
}

global.fetch = vi.fn((url: string, options: RequestInit) => {
  mockFetchState.calls.push({ url: url as string, options: options as RequestInit })
  const response = mockFetchState.responses.shift()
  if (!response) {
    throw new Error('No mock response configured')
  }
  return Promise.resolve(response)
})

// ── Test helpers ─────────────────────────────────────────────────────

function createMockOrder(overrides: Partial<{
  id: string
  restaurant_id: string
  status: string
  payment_status: string
  created_at: string
  updated_at: string
  table_id: string | null
  customer_id: string | null
  items: unknown[]
}> = {}): OrderWithItems {
  return {
    id: 'order-1',
    restaurant_id: 'rest-1',
    status: 'pending',
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    table_id: null,
    customer_id: null,
    items: [],
    ...overrides,
  } as unknown as OrderWithItems
}

function createFilters(overrides: Partial<OrderFilters> = {}): OrderFilters {
  return {
    restaurant_id: 'rest-1',
    ...overrides,
  }
}

function getLastFetchCall() {
  return mockFetchState.calls[mockFetchState.calls.length - 1]
}

function parseUrlParams(url: string): URLSearchParams {
  const qs = url.split('?')[1] || ''
  return new URLSearchParams(qs)
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('adminOrderService', () => {
  beforeEach(() => {
    setupFetch()
    vi.clearAllMocks()
  })

  describe('getOrders', () => {
    it('faz requisição GET para /api/admin/orders com restaurant_id', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ orders: [], total: 0, limit: 20, offset: 0 }),
      })

      await getOrders(createFilters({ restaurant_id: 'rest-123' }))

      expect(mockFetchState.calls[0].url).toContain('/api/admin/orders')
      expect(mockFetchState.calls[0].url).toContain('restaurant_id=rest-123')
    })

    it('concatena status como array separado por vírgula', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ orders: [], total: 0, limit: 20, offset: 0 }),
      })

      await getOrders(createFilters({ status: ['pending', 'confirmed'] }))

      const params = parseUrlParams(mockFetchState.calls[0].url)
      expect(params.get('status')).toBe('pending,confirmed')
    })

    it('concatena payment_status como array separado por vírgula', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ orders: [], total: 0, limit: 20, offset: 0 }),
      })

      await getOrders(createFilters({ payment_status: ['paid', 'pending'] }))

      const params = parseUrlParams(mockFetchState.calls[0].url)
      expect(params.get('payment_status')).toBe('paid,pending')
    })

    it('trata payment_status como string único', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ orders: [], total: 0, limit: 20, offset: 0 }),
      })

      await getOrders(createFilters({ payment_status: 'paid' }))

      const params = parseUrlParams(mockFetchState.calls[0].url)
      expect(params.get('payment_status')).toBe('paid')
    })

    it('adiciona date_from e date_to aos params quando fornecidos', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ orders: [], total: 0, limit: 20, offset: 0 }),
      })

      await getOrders(createFilters({ date_from: '2024-01-01', date_to: '2024-01-31' }))

      const params = parseUrlParams(mockFetchState.calls[0].url)
      expect(params.get('date_from')).toBe('2024-01-01')
      expect(params.get('date_to')).toBe('2024-01-31')
    })

    it('adiciona limit e offset aos params quando fornecidos', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ orders: [], total: 0, limit: 10, offset: 20 }),
      })

      await getOrders(createFilters({ limit: 10, offset: 20 }))

      const params = parseUrlParams(mockFetchState.calls[0].url)
      expect(params.get('limit')).toBe('10')
      expect(params.get('offset')).toBe('20')
    })

    it('trata status único como string (não array)', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ orders: [], total: 0, limit: 20, offset: 0 }),
      })

      await getOrders(createFilters({ status: 'preparing' }))

      const params = parseUrlParams(mockFetchState.calls[0].url)
      expect(params.get('status')).toBe('preparing')
    })

    it('retorna orders com total, limit e offset do response', async () => {
      const mockOrders = [createMockOrder({ id: 'o1' }), createMockOrder({ id: 'o2' })]
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ orders: mockOrders, total: 50, limit: 10, offset: 20 }),
      })

      const result = await getOrders(createFilters({ limit: 10, offset: 20 }))

      expect(result.orders).toHaveLength(2)
      expect(result.total).toBe(50)
      expect(result.limit).toBe(10)
      expect(result.offset).toBe(20)
    })

    it('lanza erro quando fetch retorna erro', async () => {
      mockNextResponse({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Erro interno' }),
      })

      await expect(getOrders(createFilters())).rejects.toThrow('Erro interno')
    })

    it('lanza erro genérico quando fetch retorna erro sem body', async () => {
      mockNextResponse({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await expect(getOrders(createFilters())).rejects.toThrow('Failed to fetch orders')
    })
  })

  describe('getOrder', () => {
    it('faz requisição GET para /api/admin/orders/{orderId}', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ order: createMockOrder({ id: 'order-abc' }) }),
      })

      await getOrder('order-abc')

      expect(mockFetchState.calls[0].url).toContain('/api/admin/orders/order-abc')
    })

    it('retorna order do response', async () => {
      const mockOrder = createMockOrder({ id: 'order-special' })
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ order: mockOrder }),
      })

      const result = await getOrder('order-special')

      expect(result.id).toBe('order-special')
    })

    it('lanza erro quando fetch retorna erro', async () => {
      mockNextResponse({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Order not found' }),
      })

      await expect(getOrder('order-not-found')).rejects.toThrow('Order not found')
    })

    it('lanza erro genérico quando response ok=false sem mensagem', async () => {
      mockNextResponse({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await expect(getOrder('order-123')).rejects.toThrow('Failed to fetch order')
    })

    it('lanza erro genérico quando json parsing falha', async () => {
      mockNextResponse({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(getOrder('order-123')).rejects.toThrow('Failed to fetch order')
    })
  })

  describe('getOrderStatus', () => {
    it('faz requisição GET para /api/orders/{orderId}/status', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ id: 'o1', status: 'pending', payment_status: 'pending', updated_at: '' }),
      })

      await getOrderStatus('order-xyz')

      expect(mockFetchState.calls[0].url).toContain('/api/orders/order-xyz/status')
    })

    it('retorna status do pedido', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({
          id: 'o1',
          status: 'preparing',
          payment_status: 'paid',
          updated_at: '2024-01-01T00:00:00Z',
        }),
      })

      const result = await getOrderStatus('order-123')

      expect(result.status).toBe('preparing')
      expect(result.payment_status).toBe('paid')
    })

    it('lanza erro quando fetch retorna erro', async () => {
      mockNextResponse({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      })

      await expect(getOrderStatus('invalid')).rejects.toThrow('Not found')
    })

    it('lanza erro genérico quando response sem body de erro', async () => {
      mockNextResponse({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await expect(getOrderStatus('order-123')).rejects.toThrow('Failed to fetch order status')
    })

    it('lanza erro genérico quando json parsing falha', async () => {
      mockNextResponse({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(getOrderStatus('order-123')).rejects.toThrow('Failed to fetch order status')
    })
  })

  describe('updateOrderStatus', () => {
    it('faz requisição PATCH para /api/admin/orders/{orderId}/status', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ id: 'o1', status: 'paid', payment_status: 'pending', updated_at: '' }),
      })

      await updateOrderStatus('order-123', 'paid')

      expect(mockFetchState.calls[0].url).toContain('/api/admin/orders/order-123/status')
      expect(mockFetchState.calls[0].options.method).toBe('PATCH')
    })

    it('envia status e notes no body da requisição', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ id: 'o1', status: 'preparing', payment_status: 'pending', updated_at: '' }),
      })

      await updateOrderStatus('order-123', 'preparing', 'Iniciando preparo')

      const lastCall = getLastFetchCall()
      const body = JSON.parse(lastCall.options.body as string)
      expect(body.status).toBe('preparing')
      expect(body.notes).toBe('Iniciando preparo')
    })

    it('define header Content-Type como application/json', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ id: 'o1', status: 'ready', payment_status: 'pending', updated_at: '' }),
      })

      await updateOrderStatus('order-123', 'ready')

      const lastCall = getLastFetchCall()
      expect(lastCall.options.headers).toHaveProperty('Content-Type', 'application/json')
    })

    it('retorna dados atualizados do pedido', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({
          id: 'o1',
          status: 'ready',
          payment_status: 'paid',
          updated_at: '2024-01-01T12:00:00Z',
        }),
      })

      const result = await updateOrderStatus('order-123', 'ready')

      expect(result.status).toBe('ready')
      expect(result.payment_status).toBe('paid')
    })

    it('lanza erro quando fetch retorna erro', async () => {
      mockNextResponse({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Transição inválida' }),
      })

      await expect(updateOrderStatus('order-123', 'invalid')).rejects.toThrow('Transição inválida')
    })

    it('lanza erro genérico quando response ok=false sem mensagem', async () => {
      mockNextResponse({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await expect(updateOrderStatus('order-123', 'pending')).rejects.toThrow('Failed to update order status')
    })

    it('lanza erro genérico quando json parsing falha', async () => {
      mockNextResponse({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      })

      await expect(updateOrderStatus('order-123', 'pending')).rejects.toThrow('Failed to update order status')
    })

    it('funciona sem notes (parâmetro opcional)', async () => {
      mockNextResponse({
        ok: true,
        json: () => Promise.resolve({ id: 'o1', status: 'cancelled', payment_status: 'refunded', updated_at: '' }),
      })

      await updateOrderStatus('order-123', 'cancelled')

      const lastCall = getLastFetchCall()
      const body = JSON.parse(lastCall.options.body as string)
      expect(body.notes).toBeUndefined()
    })
  })

  describe('VALID_STATUS_TRANSITIONS', () => {
    it('pending_payment permite paid e cancelled', () => {
      expect(VALID_STATUS_TRANSITIONS.pending_payment).toEqual(['paid', 'cancelled'])
    })

    it('paid permite preparing e cancelled', () => {
      expect(VALID_STATUS_TRANSITIONS.paid).toEqual(['preparing', 'cancelled'])
    })

    it('preparing permite ready e cancelled', () => {
      expect(VALID_STATUS_TRANSITIONS.preparing).toEqual(['ready', 'cancelled'])
    })

    it('ready permite delivered e cancelled', () => {
      expect(VALID_STATUS_TRANSITIONS.ready).toEqual(['delivered', 'cancelled'])
    })

    it('delivered não permite transições', () => {
      expect(VALID_STATUS_TRANSITIONS.delivered).toEqual([])
    })

    it('cancelled não permite transições', () => {
      expect(VALID_STATUS_TRANSITIONS.cancelled).toEqual([])
    })
  })

  describe('isValidStatusTransition', () => {
    it('pending_payment pode ir para paid', () => {
      expect(isValidStatusTransition('pending_payment', 'paid')).toBe(true)
    })

    it('pending_payment pode ir para cancelled', () => {
      expect(isValidStatusTransition('pending_payment', 'cancelled')).toBe(true)
    })

    it('pending_payment não pode ir para preparing', () => {
      expect(isValidStatusTransition('pending_payment', 'preparing')).toBe(false)
    })

    it('pending_payment não pode pular para ready', () => {
      expect(isValidStatusTransition('pending_payment', 'ready')).toBe(false)
    })

    it('pending_payment não pode pular para delivered', () => {
      expect(isValidStatusTransition('pending_payment', 'delivered')).toBe(false)
    })

    it('paid pode ir para preparing', () => {
      expect(isValidStatusTransition('paid', 'preparing')).toBe(true)
    })

    it('paid pode ir para cancelled', () => {
      expect(isValidStatusTransition('paid', 'cancelled')).toBe(true)
    })

    it('paid não pode pular para ready', () => {
      expect(isValidStatusTransition('paid', 'ready')).toBe(false)
    })

    it('preparing pode ir para ready', () => {
      expect(isValidStatusTransition('preparing', 'ready')).toBe(true)
    })

    it('ready pode ir para delivered', () => {
      expect(isValidStatusTransition('ready', 'delivered')).toBe(true)
    })

    it('delivered não pode transitar para nenhum estado', () => {
      expect(isValidStatusTransition('delivered', 'pending_payment')).toBe(false)
      expect(isValidStatusTransition('delivered', 'cancelled')).toBe(false)
    })

    it('cancelled não pode transitar para nenhum estado', () => {
      expect(isValidStatusTransition('cancelled', 'pending_payment')).toBe(false)
      expect(isValidStatusTransition('cancelled', 'delivered')).toBe(false)
    })
  })

  describe('getAllowedTransitions', () => {
    it('retorna transições válidas para pending_payment', () => {
      expect(getAllowedTransitions('pending_payment')).toEqual(['paid', 'cancelled'])
    })

    it('retorna transições válidas para paid', () => {
      expect(getAllowedTransitions('paid')).toEqual(['preparing', 'cancelled'])
    })

    it('retorna transições válidas para preparing', () => {
      expect(getAllowedTransitions('preparing')).toEqual(['ready', 'cancelled'])
    })

    it('retorna transições válidas para ready', () => {
      expect(getAllowedTransitions('ready')).toEqual(['delivered', 'cancelled'])
    })

    it('retorna array vazio para delivered', () => {
      expect(getAllowedTransitions('delivered')).toEqual([])
    })

    it('retorna array vazio para cancelled', () => {
      expect(getAllowedTransitions('cancelled')).toEqual([])
    })
  })

  describe('getOrderAge', () => {
    it('retorna idade em segundos', () => {
      const order = createMockOrder({
        created_at: new Date(Date.now() - 60000).toISOString(),
      })

      const age = getOrderAge(order)
      expect(age).toBeGreaterThanOrEqual(59)
      expect(age).toBeLessThanOrEqual(61)
    })

    it('retorna 0 ou próximo de 0 para pedidos muito recentes', () => {
      const order = createMockOrder({
        created_at: new Date().toISOString(),
      })

      const age = getOrderAge(order)
      expect(age).toBeLessThan(2)
    })

    it('calcula corretamente para pedido com 1 hora', () => {
      const order = createMockOrder({
        created_at: new Date(Date.now() - 3600000).toISOString(),
      })

      const age = getOrderAge(order)
      expect(age).toBeGreaterThanOrEqual(3599)
      expect(age).toBeLessThanOrEqual(3601)
    })
  })

  describe('getOrderAgeDisplay', () => {
    it('exibe segundos para < 60s', () => {
      expect(getOrderAgeDisplay(0)).toBe('0s')
      expect(getOrderAgeDisplay(30)).toBe('30s')
      expect(getOrderAgeDisplay(59)).toBe('59s')
    })

    it('exibe minutos e segundos para >= 60s e < 60m', () => {
      expect(getOrderAgeDisplay(60)).toBe('1m 0s')
      expect(getOrderAgeDisplay(90)).toBe('1m 30s')
      expect(getOrderAgeDisplay(300)).toBe('5m 0s')
      expect(getOrderAgeDisplay(3599)).toBe('59m 59s')
    })

    it('exibe horas e minutos para >= 60m', () => {
      expect(getOrderAgeDisplay(3600)).toBe('1h 0m')
      expect(getOrderAgeDisplay(3660)).toBe('1h 1m')
      expect(getOrderAgeDisplay(7200)).toBe('2h 0m')
      expect(getOrderAgeDisplay(7260)).toBe('2h 1m')
    })

    it('trunca segundos ao mostrar horas', () => {
      expect(getOrderAgeDisplay(3600 + 59)).toBe('1h 0m')
    })
  })

  describe('isOrderStale', () => {
    it('retorna false para pedidos recentes', () => {
      const order = createMockOrder({
        created_at: new Date(Date.now() - 60000).toISOString(),
      })

      expect(isOrderStale(order, 300)).toBe(false)
    })

    it('retorna true para pedidos mais velhos que threshold', () => {
      const order = createMockOrder({
        created_at: new Date(Date.now() - 600000).toISOString(),
      })

      expect(isOrderStale(order, 300)).toBe(true)
    })

    it('usa threshold padrão de 300 segundos', () => {
      const order = createMockOrder({
        created_at: new Date(Date.now() - 400000).toISOString(),
      })

      expect(isOrderStale(order)).toBe(true)
    })

    it('funciona com threshold customizado', () => {
      const order = createMockOrder({
        created_at: new Date(Date.now() - 120000).toISOString(),
      })

      expect(isOrderStale(order, 60)).toBe(true)
      expect(isOrderStale(order, 180)).toBe(false)
    })
  })
})
