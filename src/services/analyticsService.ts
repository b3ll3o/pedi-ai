/**
 * Analytics Service
 * Handles fetching analytics data for the admin dashboard.
 */

export interface AnalyticsFilters {
  restaurant_id: string
  date_from?: string
  date_to?: string
}

export interface AnalyticsSummary {
  total_orders: number
  total_revenue: number
  total_tax: number
  average_order_value: number
  cancellation_rate: number
}

export interface AnalyticsData {
  summary: AnalyticsSummary
  orders_by_status: Record<string, number>
  orders_by_payment_status: Record<string, number>
  revenue_by_day: Record<string, number>
  orders_by_day: Record<string, number>
  orders_by_hour: Record<number, number>
  popular_items: Array<{
    product_id: string
    product_name: string
    quantity: number
    revenue: number
  }>
  top_tables: Array<{
    table_id: string
    table_name: string
    order_count: number
  }>
  date_range: {
    from: string
    to: string
  }
}

// ── Fetch Analytics ──────────────────────────────────────────

export async function getAnalytics(filters: AnalyticsFilters): Promise<AnalyticsData> {
  const params = new URLSearchParams()
  params.append('restaurant_id', filters.restaurant_id)

  if (filters.date_from) {
    params.append('date_from', filters.date_from)
  }

  if (filters.date_to) {
    params.append('date_to', filters.date_to)
  }

  const response = await fetch(`/api/admin/analytics?${params.toString()}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch analytics' }))
    throw new Error(error.error || 'Failed to fetch analytics')
  }

  return response.json()
}

// ── Date Range Helpers ───────────────────────────────────────

export function getLast7Days(): { date_from: string; date_to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 7)
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: to.toISOString().split('T')[0],
  }
}

export function getLast30Days(): { date_from: string; date_to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: to.toISOString().split('T')[0],
  }
}

export function getLast90Days(): { date_from: string; date_to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 90)
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: to.toISOString().split('T')[0],
  }
}

export function getThisMonth(): { date_from: string; date_to: string } {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), 1)
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: to.toISOString().split('T')[0],
  }
}

export function getThisYear(): { date_from: string; date_to: string } {
  const to = new Date()
  const from = new Date(to.getFullYear(), 0, 1)
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: to.toISOString().split('T')[0],
  }
}

// ── Chart Helpers ────────────────────────────────────────────

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getPeakHours(ordersByHour: Record<number, number>): number[] {
  const entries = Object.entries(ordersByHour)
    .sort(([, a], [, b]) => b - a)
  const topCount = Math.max(1, Math.ceil(entries.length * 0.2)) // Top 20%
  return entries.slice(0, topCount).map(([hour]) => parseInt(hour))
}
