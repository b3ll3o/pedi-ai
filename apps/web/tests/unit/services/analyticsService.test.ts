import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────

// Mock fetch
let capturedCalls: Array<{ url: string; options: RequestInit }> = []
const mockFetch = vi.fn((url: string, options: RequestInit) => {
  capturedCalls.push({ url, options })
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      summary: {
        total_orders: 100,
        total_revenue: 5000,
        total_tax: 500,
        average_order_value: 55,
        cancellation_rate: 5.2,
      },
      orders_by_status: { pending: 20, completed: 80 },
      orders_by_payment_status: { pending: 10, paid: 90 },
      revenue_by_day: { '2024-01-01': 1000, '2024-01-02': 1500 },
      orders_by_day: { '2024-01-01': 20, '2024-01-02': 30 },
      orders_by_hour: { 12: 15, 13: 25, 14: 20, 18: 30, 19: 35 },
      popular_items: [
        { product_id: 'p1', product_name: 'Pizza', quantity: 50, revenue: 2500 },
        { product_id: 'p2', product_name: 'Burguer', quantity: 40, revenue: 1600 },
      ],
      top_tables: [
        { table_id: 't1', table_name: 'Mesa 1', order_count: 25 },
        { table_id: 't2', table_name: 'Mesa 2', order_count: 20 },
      ],
      date_range: { from: '2024-01-01', to: '2024-01-07' },
    }),
  })
})
global.fetch = mockFetch

// ── Import after mocks ─────────────────────────────────────────
import {
  getAnalytics,
  getItensMaisVendidos,
  getLast7Days,
  getLast30Days,
  getLast90Days,
  getThisMonth,
  getThisYear,
  formatCurrency,
  formatNumber,
  formatPercent,
  getPeakHours,
  getPedidosPorPeriodo,
  type AnalyticsFilters,
} from '@/application/services/analyticsService'

// ── Types for getPedidosPorPeriodo ────────────────────────────────────────────

interface _PedidosPorPeriodoResponse {
  orders_by_period: {
    day?: Record<string, { count: number; revenue: number }>
    week?: Record<string, { count: number; revenue: number }>
    month?: Record<string, { count: number; revenue: number }>
  }
  total_revenue: number
  total_orders: number
  period: string
  date_range: { start_date: string; end_date: string }
}

// ── Test helpers ────────────────────────────────────────────────

function getLastCallUrl() {
  return capturedCalls[capturedCalls.length - 1]?.url ?? ''
}

function getLastCallParams() {
  const url = getLastCallUrl()
  return new URL(url, 'http://localhost').searchParams
}

// ── Tests ───────────────────────────────────────────────────────

describe('analyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedCalls = []
    mockFetch.mockImplementation((url: string, options: RequestInit) => {
      capturedCalls.push({ url, options })
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          summary: {
            total_orders: 100,
            total_revenue: 5000,
            total_tax: 500,
            average_order_value: 55,
            cancellation_rate: 5.2,
          },
          orders_by_status: { pending: 20, completed: 80 },
          orders_by_payment_status: { pending: 10, paid: 90 },
          revenue_by_day: { '2024-01-01': 1000, '2024-01-02': 1500 },
          orders_by_day: { '2024-01-01': 20, '2024-01-02': 30 },
          orders_by_hour: { 12: 15, 13: 25, 14: 20, 18: 30, 19: 35 },
          popular_items: [
            { product_id: 'p1', product_name: 'Pizza', quantity: 50, revenue: 2500 },
            { product_id: 'p2', product_name: 'Burguer', quantity: 40, revenue: 1600 },
          ],
          top_tables: [
            { table_id: 't1', table_name: 'Mesa 1', order_count: 25 },
            { table_id: 't2', table_name: 'Mesa 2', order_count: 20 },
          ],
          date_range: { from: '2024-01-01', to: '2024-01-07' },
        }),
      })
    })
  })

  describe('getAnalytics', () => {
    it('faz fetch para /api/admin/analytics com restaurant_id', async () => {
      const filters: AnalyticsFilters = { restaurant_id: 'rest-123' }

      await getAnalytics(filters)

      const params = getLastCallParams()
      expect(getLastCallUrl()).toContain('/api/admin/analytics')
      expect(params.get('restaurant_id')).toBe('rest-123')
    })

    it('inclui date_from e date_to quando fornecidos', async () => {
      const filters: AnalyticsFilters = {
        restaurant_id: 'rest-123',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      }

      await getAnalytics(filters)

      const params = getLastCallParams()
      expect(params.get('date_from')).toBe('2024-01-01')
      expect(params.get('date_to')).toBe('2024-01-31')
    })

    it('não inclui date_from quando não fornecido', async () => {
      const filters: AnalyticsFilters = {
        restaurant_id: 'rest-123',
        date_to: '2024-01-31',
      }

      await getAnalytics(filters)

      const params = getLastCallParams()
      expect(params.has('date_from')).toBe(false)
      expect(params.get('date_to')).toBe('2024-01-31')
    })

    it('retorna dados completos do analytics', async () => {
      const filters: AnalyticsFilters = { restaurant_id: 'rest-123' }

      const result = await getAnalytics(filters)

      expect(result.summary.total_orders).toBe(100)
      expect(result.summary.total_revenue).toBe(5000)
      expect(result.summary.average_order_value).toBe(55)
      expect(result.popular_items).toHaveLength(2)
      expect(result.top_tables).toHaveLength(2)
    })

    it('lança erro quando response.ok é false', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Erro personalizado' }),
      }))

      const filters: AnalyticsFilters = { restaurant_id: 'rest-123' }

      await expect(getAnalytics(filters)).rejects.toThrow('Erro personalizado')
    })

    it('lança erro genérico quando response.ok false e sem body', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.reject(new Error('parse error')),
      }))

      const filters: AnalyticsFilters = { restaurant_id: 'rest-123' }

      await expect(getAnalytics(filters)).rejects.toThrow('Failed to fetch analytics')
    })

    it('lança erro original quando fetch rejeita (network error)', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))

      const filters: AnalyticsFilters = { restaurant_id: 'rest-123' }

      // Service throws the original error, not a generic one
      await expect(getAnalytics(filters)).rejects.toThrow('Network error')
    })
  })

  describe('getItensMaisVendidos', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      capturedCalls = []
      mockFetch.mockImplementation((url: string, options: RequestInit) => {
        capturedCalls.push({ url, options })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            items: [
              { product_id: 'p1', product_name: 'Pizza Margherita', count: 150 },
              { product_id: 'p2', product_name: 'Hambúrguer Artesanal', count: 120 },
              { product_id: 'p3', product_name: 'Salada Caesar', count: 80 },
            ],
            period: 'month',
            date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
          }),
        })
      })
    })

    it('faz fetch para /api/admin/analytics/popular-items', async () => {
      await getItensMaisVendidos('rest-123')

      expect(getLastCallUrl()).toContain('/api/admin/analytics/popular-items')
    })

    it('retorna top 10 products por padrão (limit=10)', async () => {
      const result = await getItensMaisVendidos('rest-123')

      const params = getLastCallParams()
      expect(params.get('limit')).toBe('10')
      expect(result.items).toHaveLength(3)
      expect(result.items[0].product_id).toBe('p1')
      expect(result.items[0].count).toBe(150)
    })

    it('respecta date range filter (date_from e date_to)', async () => {
      await getItensMaisVendidos('rest-123', {
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      })

      const params = getLastCallParams()
      expect(params.get('start_date')).toBe('2024-01-01')
      expect(params.get('end_date')).toBe('2024-01-31')
    })

    it('não inclui start_date quando não fornecido', async () => {
      await getItensMaisVendidos('rest-123', {
        date_to: '2024-01-31',
      })

      const params = getLastCallParams()
      expect(params.has('start_date')).toBe(false)
      expect(params.get('end_date')).toBe('2024-01-31')
    })

    it('respecta período filter (day, week, month)', async () => {
      await getItensMaisVendidos('rest-123', {
        period: 'week',
      })

      const params = getLastCallParams()
      expect(params.get('period')).toBe('week')
    })

    it('retorna empty items array se não houver pedidos', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          items: [],
          period: 'month',
          date_range: { start_date: '2024-01-01', end_date: '2024-01-31' },
        }),
      }))

      const result = await getItensMaisVendidos('rest-123')

      expect(result.items).toEqual([])
    })

    it('lança erro quando response.ok é false', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Erro interno' }),
      }))

      await expect(getItensMaisVendidos('rest-123')).rejects.toThrow('Erro interno')
    })

    it('lança erro genérico quando fetch rejeita (network error)', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))

      await expect(getItensMaisVendidos('rest-123')).rejects.toThrow('Network error')
    })

    it('lança erro genérico quando response.ok false e json rejeita', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.reject(new Error('JSON parse error')),
      }))

      await expect(getItensMaisVendidos('rest-123')).rejects.toThrow('Erro ao buscar itens mais vendidos')
    })
  })

  describe('getPedidosPorPeriodo', () => {
    const mockPedidosPorPeriodoResponse = {
      orders_by_period: {
        day: {
          '2024-01-07': { count: 15, revenue: 750.0 },
          '2024-01-06': { count: 12, revenue: 600.0 },
          '2024-01-05': { count: 20, revenue: 1000.0 },
        },
        week: {
          '2024-W01': { count: 47, revenue: 2350.0 },
          '2024-W02': { count: 55, revenue: 2750.0 },
        },
        month: {
          '2024-01': { count: 102, revenue: 5100.0 },
        },
      },
      total_revenue: 5100.0,
      total_orders: 102,
      period: 'day',
      date_range: { start_date: '2024-01-01', end_date: '2024-01-07' },
    }

    beforeEach(() => {
      vi.clearAllMocks()
      capturedCalls = []
      mockFetch.mockImplementation((url: string, options: RequestInit) => {
        capturedCalls.push({ url, options })
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPedidosPorPeriodoResponse),
        })
      })
    })

    it('faz fetch para /api/admin/analytics/orders-by-period com restaurant_id e period', async () => {
      await getPedidosPorPeriodo('rest-123', { period: 'day' })

      expect(getLastCallUrl()).toContain('/api/admin/analytics/orders-by-period')
      const params = getLastCallParams()
      expect(params.get('restaurant_id')).toBe('rest-123')
      expect(params.get('period')).toBe('day')
    })

    it('retorna pedidos agrupados por dia quando period=day', async () => {
      const result = await getPedidosPorPeriodo('rest-123', { period: 'day' })

      expect(result.orders_by_period.day).toBeDefined()
      expect(result.orders_by_period.day['2024-01-07']).toEqual({ count: 15, revenue: 750.0 })
      expect(result.orders_by_period.day['2024-01-05']).toEqual({ count: 20, revenue: 1000.0 })
    })

    it('retorna pedidos agrupados por semana quando period=week', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          orders_by_period: {
            week: {
              '2024-W01': { count: 47, revenue: 2350.0 },
              '2024-W02': { count: 55, revenue: 2750.0 },
            },
          },
          total_revenue: 5100.0,
          total_orders: 102,
          period: 'week',
          date_range: { start_date: '2024-01-01', end_date: '2024-01-14' },
        }),
      }))

      const result = await getPedidosPorPeriodo('rest-123', { period: 'week' })

      expect(result.orders_by_period.week).toBeDefined()
      expect(result.orders_by_period.week['2024-W01']).toEqual({ count: 47, revenue: 2350.0 })
      expect(result.orders_by_period.week['2024-W02']).toEqual({ count: 55, revenue: 2750.0 })
    })

    it('retorna pedidos agrupados por mês quando period=month', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          orders_by_period: {
            month: {
              '2024-01': { count: 102, revenue: 5100.0 },
              '2024-02': { count: 89, revenue: 4450.0 },
            },
          },
          total_revenue: 9550.0,
          total_orders: 191,
          period: 'month',
          date_range: { start_date: '2024-01-01', end_date: '2024-02-28' },
        }),
      }))

      const result = await getPedidosPorPeriodo('rest-123', { period: 'month' })

      expect(result.orders_by_period.month).toBeDefined()
      expect(result.orders_by_period.month['2024-01']).toEqual({ count: 102, revenue: 5100.0 })
      expect(result.orders_by_period.month['2024-02']).toEqual({ count: 89, revenue: 4450.0 })
    })

    it('inclui revenue total por período', async () => {
      const result = await getPedidosPorPeriodo('rest-123', { period: 'day' })

      expect(result.total_revenue).toBe(5100.0)
      // Verifica revenue individual por dia
      expect(result.orders_by_period.day['2024-01-07'].revenue).toBe(750.0)
      expect(result.orders_by_period.day['2024-01-05'].revenue).toBe(1000.0)
    })

    it('inclui total de pedidos no período', async () => {
      const result = await getPedidosPorPeriodo('rest-123', { period: 'day' })

      expect(result.total_orders).toBe(102)
    })

    it('retorna array vazio quando não há pedidos (empty result)', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          orders_by_period: {
            day: {},
            week: {},
            month: {},
          },
          total_revenue: 0,
          total_orders: 0,
          period: 'day',
          date_range: { start_date: '2024-01-01', end_date: '2024-01-07' },
        }),
      }))

      const result = await getPedidosPorPeriodo('rest-123', { period: 'day' })

      expect(result.orders_by_period.day).toEqual({})
      expect(result.total_revenue).toBe(0)
      expect(result.total_orders).toBe(0)
    })

    it('respecta date_from e date_to quando fornecidos', async () => {
      await getPedidosPorPeriodo('rest-123', {
        period: 'day',
        date_from: '2024-01-01',
        date_to: '2024-01-31',
      })

      const params = getLastCallParams()
      expect(params.get('date_from')).toBe('2024-01-01')
      expect(params.get('date_to')).toBe('2024-01-31')
    })

    it('não inclui date_from quando não fornecido', async () => {
      await getPedidosPorPeriodo('rest-123', { period: 'day' })

      const params = getLastCallParams()
      expect(params.has('date_from')).toBe(false)
      expect(params.has('date_to')).toBe(false)
    })

    it('não inclui period quando não fornecido', async () => {
      await getPedidosPorPeriodo('rest-123', {})

      const params = getLastCallParams()
      expect(params.has('period')).toBe(false)
    })

    it('lança erro quando response.ok é false', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Erro interno' }),
      }))

      await expect(getPedidosPorPeriodo('rest-123', { period: 'day' })).rejects.toThrow('Erro interno')
    })

    it('lança erro genérico quando fetch rejeita (network error)', async () => {
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))

      await expect(getPedidosPorPeriodo('rest-123', { period: 'day' })).rejects.toThrow('Network error')
    })

    it('lança erro genérico quando response.ok false e json rejeita', async () => {
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: false,
        json: () => Promise.reject(new Error('JSON parse error')),
      }))

      await expect(getPedidosPorPeriodo('rest-123', { period: 'day' })).rejects.toThrow('Erro ao buscar pedidos por período')
    })
  })

  describe('date range helpers', () => {
    describe('getLast7Days', () => {
      it('retorna range de 7 dias até hoje', () => {
        const result = getLast7Days()

        expect(result.date_from).toBeDefined()
        expect(result.date_to).toBeDefined()
        expect(result.date_from.length).toBe(10) // YYYY-MM-DD
        expect(result.date_to.length).toBe(10)
      })

      it('date_from é aproximadamente 7 dias antes de date_to', () => {
        const result = getLast7Days()

        const from = new Date(result.date_from)
        const to = new Date(result.date_to)
        const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

        expect(diffDays).toBe(7)
      })
    })

    describe('getLast30Days', () => {
      it('retorna range de 30 dias até hoje', () => {
        const result = getLast30Days()

        expect(result.date_from.length).toBe(10)
        expect(result.date_to.length).toBe(10)
      })

      it('date_from é aproximadamente 30 dias antes de date_to', () => {
        const result = getLast30Days()

        const from = new Date(result.date_from)
        const to = new Date(result.date_to)
        const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

        expect(diffDays).toBe(30)
      })
    })

    describe('getLast90Days', () => {
      it('retorna range de 90 dias até hoje', () => {
        const result = getLast90Days()

        expect(result.date_from.length).toBe(10)
        expect(result.date_to.length).toBe(10)
      })

      it('date_from é aproximadamente 90 dias antes de date_to', () => {
        const result = getLast90Days()

        const from = new Date(result.date_from)
        const to = new Date(result.date_to)
        const diffDays = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))

        expect(diffDays).toBe(90)
      })
    })

    describe('getThisMonth', () => {
      it('retorna range com primeiro dia do mês e hoje', () => {
        const result = getThisMonth()
        const today = new Date()

        const from = new Date(result.date_from)
        const to = new Date(result.date_to)

        // Verifica que date_from é dia 1
        expect(from.getUTCDate()).toBe(1)
        // Verifica que date_from é do mês atual
        expect(from.getUTCMonth()).toBe(today.getMonth())
        expect(from.getUTCFullYear()).toBe(today.getFullYear())
        // date_to deve ser hoje ou antes
        expect(to.getTime()).toBeLessThanOrEqual(today.getTime())
      })

      it('date_to é hoje', () => {
        const result = getThisMonth()
        const todayStr = new Date().toISOString().split('T')[0]

        expect(result.date_to).toBe(todayStr)
      })
    })

    describe('getThisYear', () => {
      it('retorna range com primeiro dia do ano e hoje', () => {
        const result = getThisYear()
        const today = new Date()

        const from = new Date(result.date_from)
        const to = new Date(result.date_to)

        // Verifica que date_from é dia 1 de janeiro
        expect(from.getUTCDate()).toBe(1)
        expect(from.getUTCMonth()).toBe(0) // Janeiro
        expect(from.getUTCFullYear()).toBe(today.getFullYear())
        // date_to deve ser hoje ou antes
        expect(to.getTime()).toBeLessThanOrEqual(today.getTime())
      })

      it('date_to é hoje', () => {
        const result = getThisYear()
        const todayStr = new Date().toISOString().split('T')[0]

        expect(result.date_to).toBe(todayStr)
      })
    })
  })

  describe('formatCurrency', () => {
    it('formata número como moeda brasileira (BRL)', () => {
      const result = formatCurrency(1234.56)

      expect(result).toContain('1')
      expect(result).toContain('234')
      expect(result).toContain('56')
    })

    it('formata zero como R$ 0,00', () => {
      const result = formatCurrency(0)

      expect(result).toContain('0')
    })

    it('formata valores grandes corretamente', () => {
      const result = formatCurrency(10000.5)

      expect(result).toContain('10.000')
    })
  })

  describe('formatNumber', () => {
    it('formata número com separador de milhar brasileiro', () => {
      const result = formatNumber(1234567)

      expect(result).toContain('1')
      expect(result).toContain('234')
      expect(result).toContain('567')
    })

    it('formata zero corretamente', () => {
      const result = formatNumber(0)

      expect(result).toBe('0')
    })
  })

  describe('formatPercent', () => {
    it('formata com uma casa decimal e símbolo %', () => {
      const result = formatPercent(25.5)

      expect(result).toBe('25.5%')
    })

    it('formata zero com decimal', () => {
      const result = formatPercent(0)

      expect(result).toBe('0.0%')
    })

    it('arredonda para cima corretamente', () => {
      const result = formatPercent(33.33)

      expect(result).toBe('33.3%')
    })
  })

  describe('getPeakHours', () => {
    it('retorna top 20% das horas com mais pedidos', () => {
      const ordersByHour: Record<number, number> = {
        10: 5,
        11: 10,
        12: 50,
        13: 45,
        14: 20,
        15: 15,
        18: 30,
        19: 35,
        20: 25,
      }

      const result = getPeakHours(ordersByHour)

      // 9 horas * 0.2 = 1.8 → ceil = 2 horas
      expect(result.length).toBe(2)
      // Deve incluir as horas com mais pedidos (12 e 13)
      expect(result).toContain(12)
      expect(result).toContain(13)
    })

    it('retorna ao menos 1 hora mesmo com poucas entradas', () => {
      const ordersByHour: Record<number, number> = { 12: 50, 13: 10 }

      const result = getPeakHours(ordersByHour)

      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('retorna horas ordenadas por popularidade (maior primeiro)', () => {
      const ordersByHour: Record<number, number> = {
        10: 5,
        12: 50,
        14: 20,
        18: 35,
      }

      const result = getPeakHours(ordersByHour)

      // Deve começar com a hora mais alta (12)
      expect(result[0]).toBe(12)
    })

    it('funciona com objeto vazio', () => {
      const ordersByHour: Record<number, number> = {}

      const result = getPeakHours(ordersByHour)

      expect(result).toEqual([])
    })

    it('funciona com uma única hora', () => {
      const ordersByHour: Record<number, number> = { 12: 100 }

      const result = getPeakHours(ordersByHour)

      expect(result).toEqual([12])
    })
  })
})