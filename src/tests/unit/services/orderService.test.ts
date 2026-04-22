// @ts-nocheck
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

// Mock tableStore - inline factory to avoid hoisting issues
vi.mock('@/stores/tableStore', () => ({
  useTableStore: {
    getState: vi.fn(() => ({ restaurantId: 'rest-mock' })),
  },
}))

// Mock sync module (queueOrderForSync)
vi.mock('@/lib/offline/sync', () => ({
  queueOrderForSync: vi.fn().mockResolvedValue(1),
}))

// Mock fetch - use mockImplementation to capture calls properly
let capturedCalls: Array<{ url: string; options: RequestInit }> = []
const mockFetch = vi.fn((url: string, options: RequestInit) => {
  capturedCalls.push({ url, options })
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ id: 'order-mock', restaurant_id: 'rest-123', status: 'pending',
      subtotal: 0, tax: 0, total: 0, table_id: null, customer_id: null,
      payment_method: 'pix', payment_status: 'pending', created_at: '', updated_at: '' }),
  })
})
global.fetch = mockFetch

// ── Import after mocks ─────────────────────────────────────────
import {
  createOrderFromCart,
  generateIdempotencyKey,
  type Order,
} from '@/services/orderService'
import { queueOrderForSync } from '@/lib/offline/sync'
import { useTableStore } from '@/stores/tableStore'

// ── Test helpers ───────────────────────────────────────────────

function createCartItem(overrides: Partial<{
  productId: string
  quantity: number
  unitPrice: number
  modifiers: Array<{ modifier_id: string; price_adjustment: number }>
  comboId?: string
  bundlePrice?: number
  notes?: string
}> = {}) {
  return {
    productId: 'prod-1',
    quantity: 1,
    unitPrice: 10,
    modifiers: [] as Array<{ modifier_id: string; price_adjustment: number }>,
    ...overrides,
  }
}

// Helper to get last fetch call body
function getLastCallBody() {
  const last = capturedCalls[capturedCalls.length - 1]
  return last?.options?.body as string | undefined
}

function parseBody(body: string | undefined) {
  if (!body) return {}
  try {
    // body is a JSON string, parse it
    return JSON.parse(body)
  } catch {
    return {}
  }
}

// ── Tests ───────────────────────────────────────────────────────

describe('orderService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedCalls = []
    // Reset mockGetState to default
    vi.mocked(useTableStore.getState).mockReturnValue({ restaurantId: 'rest-mock' })
  })

  describe('generateIdempotencyKey', () => {
    it('gera key com formato correto: restaurantId:hash:timestamp', async () => {
      const cart = [createCartItem({ productId: 'prod-1', quantity: 2 })]
      const key = await generateIdempotencyKey(cart, 'rest-123')

      expect(key).toMatch(/^rest-123:[a-f0-9]{64}:\d+$/)
    })

    it('mesmo cart = mesma key (mesmo hash)', async () => {
      const cart1 = [createCartItem({ productId: 'prod-1', quantity: 2 })]
      const cart2 = [createCartItem({ productId: 'prod-1', quantity: 2 })]

      const [key1, key2] = await Promise.all([
        generateIdempotencyKey(cart1, 'rest-123'),
        generateIdempotencyKey(cart2, 'rest-123'),
      ])

      expect(key1.split(':')[1]).toBe(key2.split(':')[1])
    })

    it('cart diferente = key diferente', async () => {
      const cart1 = [createCartItem({ productId: 'prod-1', quantity: 2 })]
      const cart2 = [createCartItem({ productId: 'prod-1', quantity: 3 })]

      const [key1, key2] = await Promise.all([
        generateIdempotencyKey(cart1, 'rest-123'),
        generateIdempotencyKey(cart2, 'rest-123'),
      ])

      expect(key1).not.toBe(key2)
    })

    it('ordem diferente dos items produce mesmo hash (ordenação interna)', async () => {
      const cart1 = [
        createCartItem({ productId: 'prod-a', quantity: 1 }),
        createCartItem({ productId: 'prod-b', quantity: 1 }),
      ]
      const cart2 = [
        createCartItem({ productId: 'prod-b', quantity: 1 }),
        createCartItem({ productId: 'prod-a', quantity: 1 }),
      ]

      const [key1, key2] = await Promise.all([
        generateIdempotencyKey(cart1, 'rest-123'),
        generateIdempotencyKey(cart2, 'rest-123'),
      ])

      expect(key1.split(':')[1]).toBe(key2.split(':')[1])
    })

    it('modifiers diferentes produzem hash diferente', async () => {
      const cart1 = [createCartItem({
        productId: 'prod-1',
        modifiers: [{ modifier_id: 'mod-1', price_adjustment: 1 }],
      })]
      const cart2 = [createCartItem({
        productId: 'prod-1',
        modifiers: [{ modifier_id: 'mod-1', price_adjustment: 2 }],
      })]

      const [key1, key2] = await Promise.all([
        generateIdempotencyKey(cart1, 'rest-123'),
        generateIdempotencyKey(cart2, 'rest-123'),
      ])

      expect(key1).not.toBe(key2)
    })

    it('usa restaurantId do store quando não fornecido', async () => {
      const cart = [createCartItem()]
      const key = await generateIdempotencyKey(cart)

      expect(key).toMatch(/^rest-mock:[a-f0-9]{64}:\d+$/)
    })
  })

  describe('createOrderFromCart - fluxo online (fetch sucesso)', () => {
    it('cria order com sucesso e retorna dados completos', async () => {
      // Custom mock for this test
      mockFetch.mockImplementationOnce((url: string, options: RequestInit) => {
        capturedCalls.push({ url, options })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 'order-123',
            restaurant_id: 'rest-123',
            table_id: 'table-5',
            customer_id: 'cust-1',
            status: 'pending',
            subtotal: 100,
            tax: 10,
            total: 110,
            payment_method: 'pix',
            payment_status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
      })

      const cart = [createCartItem({ productId: 'prod-1', quantity: 10, unitPrice: 10 })]

      const result = await createOrderFromCart({
        cart,
        customerId: 'cust-1',
        tableId: 'table-5',
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      expect(result.id).toBe('order-123')
      expect(result.status).toBe('pending')
      expect(result.total).toBe(110)
      expect(mockFetch).toHaveBeenCalledWith('/api/orders', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Idempotency-Key': expect.any(String),
        }),
      }))
    })

    it('calcula subtotal, tax e total corretamente', async () => {
      // subtotal = 100 + 30 + 25 = 155, tax = 15.50, total = 170.50
      const cart = [
        createCartItem({ productId: 'prod-1', quantity: 2, unitPrice: 50 }),
        createCartItem({ productId: 'prod-2', quantity: 1, unitPrice: 30 }),
        createCartItem({ productId: 'prod-3', quantity: 1, unitPrice: 20, modifiers: [{ modifier_id: 'mod-1', price_adjustment: 5 }] }),
      ]

      await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      const body = parseBody(getLastCallBody())

      expect(body.order.subtotal).toBe(155)
      expect(body.order.tax).toBe(15.5)
      expect(body.order.total).toBe(170.5)
    })

    it('mapeia paymentMethod pix para pix', async () => {
      const cart = [createCartItem()]

      await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      const body = parseBody(getLastCallBody())
      expect(body.order.payment_method).toBe('pix')
    })

    it('mapeia paymentMethod card para credit_card', async () => {
      const cart = [createCartItem()]

      await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'card',
        restaurantId: 'rest-123',
      })

      const body = parseBody(getLastCallBody())
      expect(body.order.payment_method).toBe('credit_card')
    })

    it('lança erro quando cart está vazio', async () => {
      await expect(createOrderFromCart({
        cart: [],
        customerId: 'cust-1',
        tableId: 'table-5',
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })).rejects.toThrow('Cannot create order from empty cart')
    })

    it('lança erro quando restaurantId não fornecido e store não tem', async () => {
      vi.mocked(useTableStore.getState).mockReturnValueOnce({ restaurantId: null })

      await expect(createOrderFromCart({
        cart: [createCartItem()],
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
      })).rejects.toThrow('Restaurant ID is required to create an order')
    })

    // Note: HTTP errors (response.ok = false) are caught and treated as offline orders
    // The service does not distinguish HTTP errors from network errors - both queue for sync
    it('HTTP error (ok=false) também resulta em order offline (mesmo comportamento que network error)', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Erro personalizado' }),
      }))

      const result = await createOrderFromCart({
        cart: [createCartItem()],
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      // HTTP errors também enfileiram para sync
      expect(queueOrderForSync).toHaveBeenCalledTimes(1)
      expect(result.id).toMatch(/^offline-\d+$/)
      expect(result.status).toBe('pending')
    })

    // When fetch completely fails (rejects), also treated as offline
    it('fetch reject (network error) resulta em order offline', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))

      const result = await createOrderFromCart({
        cart: [createCartItem()],
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      expect(queueOrderForSync).toHaveBeenCalledTimes(1)
      expect(result.id).toMatch(/^offline-\d+$/)
    })
  })

  describe('createOrderFromCart - fluxo offline (fetch falha)', () => {
    it('quando fetch falha, enfileira para sync e retorna order offline', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))

      const cart = [createCartItem({ productId: 'prod-1', quantity: 2, unitPrice: 50 })]

      const result = await createOrderFromCart({
        cart,
        customerId: 'cust-1',
        tableId: 'table-5',
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      expect(queueOrderForSync).toHaveBeenCalledTimes(1)
      expect(queueOrderForSync).toHaveBeenCalledWith(expect.objectContaining({
        order: expect.objectContaining({
          restaurant_id: 'rest-123',
          table_id: 'table-5',
          customer_id: 'cust-1',
          status: 'pending',
        }),
        items: expect.any(Array),
      }))

      expect(result.id).toMatch(/^offline-\d+$/)
      expect(result.status).toBe('pending')
      expect(result.payment_status).toBe('pending')
    })

    it('order offline tem campos calculados corretamente', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))

      const cart = [createCartItem({ productId: 'prod-1', quantity: 3, unitPrice: 20 })]

      const result = await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'card',
        restaurantId: 'rest-offline',
      })

      expect(result.subtotal).toBe(60)
      expect(result.tax).toBe(6)
      expect(result.total).toBe(66)
      expect(result.payment_method).toBe('credit_card')
      expect(result.restaurant_id).toBe('rest-offline')
    })

    it('order offline inclui items com dados corretos', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))

      const cart = [
        createCartItem({ productId: 'prod-1', quantity: 2, unitPrice: 10 }),
        createCartItem({
          productId: 'prod-2',
          quantity: 1,
          unitPrice: 25,
          modifiers: [{ modifier_id: 'mod-extra', price_adjustment: 3 }],
          notes: 'sem cebola',
        }),
      ]

      const result = await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      expect(result.items).toHaveLength(2)
      expect(result.items![0]).toMatchObject({
        product_id: 'prod-1',
        quantity: 2,
        unit_price: 10,
        total_price: 20,
      })
      expect(result.items![1]).toMatchObject({
        product_id: 'prod-2',
        quantity: 1,
        unit_price: 25,
        total_price: 28,
        notes: 'sem cebola',
      })
    })

    it('combos usam bundlePrice em vez de unitPrice', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))

      const cart = [createCartItem({
        productId: 'combo-1',
        comboId: 'combo-abc',
        quantity: 2,
        unitPrice: 50,
        bundlePrice: 35,
      })]

      const result = await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      expect(result.items![0].unit_price).toBe(35)
      expect(result.items![0].total_price).toBe(70)
      expect(result.subtotal).toBe(70)
    })
  })

  describe('createOrderFromCart - idempotency key header', () => {
    it('envia idempotency key no header X-Idempotency-Key', async () => {
      const [url, options] = capturedCalls[capturedCalls.length - 1]
        ? [capturedCalls[0].url, capturedCalls[0].options]
        : ['', {}]

      // Run a fresh call
      capturedCalls = []
      mockFetch.mockImplementationOnce((url: string, options: RequestInit) => {
        capturedCalls.push({ url, options })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'o1', restaurant_id: 'r', status: 'pending',
            subtotal: 0, tax: 0, total: 0, table_id: null, customer_id: null,
            payment_method: 'pix', payment_status: 'pending', created_at: '', updated_at: '' }),
        })
      })

      await createOrderFromCart({
        cart: [createCartItem()],
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      const captured = capturedCalls[0]
      expect(captured.url).toBe('/api/orders')
      expect(captured.options.headers['X-Idempotency-Key']).toMatch(/^rest-123:[a-f0-9]{64}:\d+$/)
    })
  })

  describe('createOrderFromCart - items payload', () => {
    it('converte cart items para items payload com combo', async () => {
      capturedCalls = []
      mockFetch.mockImplementationOnce((url: string, options: RequestInit) => {
        capturedCalls.push({ url, options })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'o1', restaurant_id: 'r', status: 'pending',
            subtotal: 0, tax: 0, total: 0, table_id: null, customer_id: null,
            payment_method: 'pix', payment_status: 'pending', created_at: '', updated_at: '' }),
        })
      })

      const cart = [createCartItem({
        productId: 'prod-1',
        comboId: 'combo-1',
        quantity: 3,
        unitPrice: 20,
        bundlePrice: 55,
        notes: 'observação',
      })]

      await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      const body = parseBody(getLastCallBody())

      expect(body.items[0]).toMatchObject({
        product_id: 'prod-1',
        combo_id: 'combo-1',
        quantity: 3,
        unit_price: 55,
        total_price: 165,
        notes: 'observação',
      })
    })

    it('items sem combo têm combo_id null', async () => {
      capturedCalls = []
      mockFetch.mockImplementationOnce((url: string, options: RequestInit) => {
        capturedCalls.push({ url, options })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'o1', restaurant_id: 'r', status: 'pending',
            subtotal: 0, tax: 0, total: 0, table_id: null, customer_id: null,
            payment_method: 'pix', payment_status: 'pending', created_at: '', updated_at: '' }),
        })
      })

      const cart = [createCartItem({ productId: 'prod-regular', comboId: undefined })]

      await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      const body = parseBody(getLastCallBody())

      expect(body.items[0].combo_id).toBeNull()
    })
  })

  describe('queueOrderForSync (offline queue)', () => {
    it('é chamado com estrutura correta quando fetch falha', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))

      const cart = [createCartItem({ productId: 'prod-1', quantity: 1 })]

      await createOrderFromCart({
        cart,
        customerId: 'cust-1',
        tableId: 'table-1',
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      expect(queueOrderForSync).toHaveBeenCalledWith(expect.objectContaining({
        order: expect.objectContaining({
          restaurant_id: 'rest-123',
          customer_id: 'cust-1',
          status: 'pending',
          payment_status: 'pending',
        }),
        items: expect.arrayContaining([
          expect.objectContaining({ product_id: 'prod-1' }),
        ]),
      }))
    })
  })

  describe('price calculation edge cases', () => {
    it('calcula corretamente com múltiplos modifiers', async () => {
      capturedCalls = []
      mockFetch.mockImplementationOnce((url: string, options: RequestInit) => {
        capturedCalls.push({ url, options })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'o1', restaurant_id: 'r', status: 'pending',
            subtotal: 0, tax: 0, total: 0, table_id: null, customer_id: null,
            payment_method: 'pix', payment_status: 'pending', created_at: '', updated_at: '' }),
        })
      })

      // unitPrice 30 + 5 + 3 = 38 por item, vezes 2 = 76
      const cart = [createCartItem({
        productId: 'prod-1',
        quantity: 2,
        unitPrice: 30,
        modifiers: [
          { modifier_id: 'mod-1', price_adjustment: 5 },
          { modifier_id: 'mod-2', price_adjustment: 3 },
        ],
      })]

      await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      const body = parseBody(getLastCallBody())

      expect(body.order.subtotal).toBe(76)
    })

    it('trunca tax para 2 casas decimais', async () => {
      capturedCalls = []
      mockFetch.mockImplementationOnce((url: string, options: RequestInit) => {
        capturedCalls.push({ url, options })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'o1', restaurant_id: 'r', status: 'pending',
            subtotal: 0, tax: 0, total: 0, table_id: null, customer_id: null,
            payment_method: 'pix', payment_status: 'pending', created_at: '', updated_at: '' }),
        })
      })

      // subtotal = 33.33, tax = 3.333 → truncado para 3.33, total = 36.66
      const cart = [createCartItem({ quantity: 1, unitPrice: 33.33 })]

      await createOrderFromCart({
        cart,
        customerId: null,
        tableId: null,
        paymentMethod: 'pix',
        restaurantId: 'rest-123',
      })

      const body = parseBody(getLastCallBody())

      expect(body.order.tax).toBe(3.33)
      expect(body.order.total).toBe(36.66)
    })
  })
})