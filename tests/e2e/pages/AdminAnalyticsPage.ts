import { Page, Locator } from '@playwright/test'

export class AdminAnalyticsPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly loadingIndicator: Locator
  readonly errorMessage: Locator
  readonly summaryCards: Locator
  readonly tabs: Locator
  readonly productsTab: Locator
  readonly overviewTab: Locator
  readonly tablesTab: Locator
  readonly dateRangeButtons: Locator
  readonly ordersByDayChart: Locator
  readonly revenueByDayChart: Locator
  readonly popularItemsTable: Locator
  readonly topTablesTable: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('h1').filter({ hasText: /analytics/i })
    this.loadingIndicator = page.locator('text=Carregando analytics')
    this.errorMessage = page.locator('h2').filter({ hasText: /erro ao carregar/i })
    this.summaryCards = page.locator('[data-testid="summary-card"]')
    this.tabs = page.locator('button').filter({ hasText: /visão geral|produtos|mesas/i })
    this.productsTab = page.locator('button').filter({ hasText: /^produtos$/i })
    this.overviewTab = page.locator('button').filter({ hasText: /^visão geral$/i })
    this.tablesTab = page.locator('button').filter({ hasText: /^mesas$/i })
    this.dateRangeButtons = page.locator('button').filter({ hasText: /7 dias|30 dias|90 dias|este mês|este ano/i })
    this.ordersByDayChart = page.locator('text=Pedidos por Dia').locator('..')
    this.revenueByDayChart = page.locator('text=Receita por Dia').locator('..')
    this.popularItemsTable = page.locator('table').filter({ has: page.locator('thead th').filter({ hasText: 'Produto' }) })
    this.topTablesTable = page.locator('table').filter({ has: page.locator('thead th').filter({ hasText: 'Mesa' }) })
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/analytics')
    await this.page.waitForLoadState('networkidle')
  }

  async waitForLoading(): Promise<void> {
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {})
  }

  async selectProductsTab(): Promise<void> {
    await this.productsTab.click()
  }

  async selectOverviewTab(): Promise<void> {
    await this.overviewTab.click()
  }

  async selectTablesTab(): Promise<void> {
    await this.tablesTab.click()
  }

  async selectDateRange(preset: '7d' | '30d' | '90d' | 'month' | 'year'): Promise<void> {
    const buttonMap = {
      '7d': '7 dias',
      '30d': '30 dias',
      '90d': '90 dias',
      'month': 'Este mês',
      'year': 'Este ano',
    }
    await this.page.locator('button').filter({ hasText: buttonMap[preset] }).click()
  }

  async getPopularItemsCount(): Promise<number> {
    return this.popularItemsTable.locator('tbody tr').count()
  }

  async getTopProductsList(): Promise<string[]> {
    const rows = this.popularItemsTable.locator('tbody tr')
    const count = await rows.count()
    const products: string[] = []
    for (let i = 0; i < count; i++) {
      const name = await rows.nth(i).locator('td').first().textContent()
      if (name) products.push(name)
    }
    return products
  }

  async getSummaryTotalOrders(): Promise<string> {
    return this.page.locator('text=Total de Pedidos').locator('..').locator('span').last().textContent() ?? ''
  }

  async getSummaryTotalRevenue(): Promise<string> {
    return this.page.locator('text=Receita Total').locator('..').locator('span').last().textContent() ?? ''
  }

  async getSummaryAverageTicket(): Promise<string> {
    return this.page.locator('text=Ticket Médio').locator('..').locator('span').last().textContent() ?? ''
  }

  async getOrdersByDayCount(): Promise<number> {
    const chartSection = this.page.locator('text=Pedidos por Dia').locator('..')
    const bars = await chartSection.locator('rect').count()
    return bars > 0 ? bars : 0
  }

  async isChartDisplayed(chartName: 'orders' | 'revenue'): Promise<boolean> {
    if (chartName === 'orders') {
      return this.ordersByDayChart.isVisible()
    }
    return this.revenueByDayChart.isVisible()
  }
}
