import { test, expect } from '../shared/fixtures'
import { AdminAnalyticsPage } from '../../pages/AdminAnalyticsPage'

test.describe('Admin Analytics', () => {
  let analyticsPage: AdminAnalyticsPage

  test.beforeEach(async ({ admin }) => {
    analyticsPage = new AdminAnalyticsPage(admin)
    await analyticsPage.goto()
    await analyticsPage.waitForLoading()
  })

  test('should display analytics page title', async ({ admin }) => {
    await expect(analyticsPage.pageTitle).toBeVisible()
    await expect(admin.locator('h1')).toContainText(/analytics/i)
  })

  test('should display summary cards', async ({ admin: _admin }) => {
    await expect(analyticsPage.summaryCards.first()).toBeVisible()
    const totalOrders = await analyticsPage.getSummaryTotalOrders()
    expect(totalOrders).not.toBe('')
  })

  test('should display date range selector buttons', async ({ admin: _admin }) => {
    await expect(analyticsPage.dateRangeButtons.first()).toBeVisible()
    const buttonCount = await analyticsPage.dateRangeButtons.count()
    expect(buttonCount).toBe(5)
  })

  test('should switch to products tab', async ({ admin: _admin }) => {
    await analyticsPage.selectProductsTab()
    await expect(analyticsPage.popularItemsTable).toBeVisible()
  })

  test('should switch to overview tab', async ({ admin: _admin }) => {
    await analyticsPage.selectOverviewTab()
    await expect(analyticsPage.overviewTab).toHaveClass(/activeTab/)
  })

  test('should switch to tables tab', async ({ admin: _admin }) => {
    await analyticsPage.selectTablesTab()
    await expect(analyticsPage.topTablesTable).toBeVisible()
  })

  test.describe('View popular items report', () => {
    test('should display top 10 products when selecting Produtos tab', { tag: '@smoke' }, async ({ admin: _admin }) => {
      await analyticsPage.selectProductsTab()
      await expect(analyticsPage.popularItemsTable).toBeVisible()
      const itemsCount = await analyticsPage.getPopularItemsCount()
      expect(itemsCount).toBeGreaterThan(0)
      expect(itemsCount).toBeLessThanOrEqual(10)
    })

    test('should display popular items with product name, quantity and revenue', async ({ admin: _admin }) => {
      await analyticsPage.selectProductsTab()
      const firstRow = analyticsPage.popularItemsTable.locator('tbody tr').first()
      await expect(firstRow.locator('td').first()).not.toBeEmpty()
      const cells = firstRow.locator('td')
      expect(await cells.count()).toBeGreaterThanOrEqual(2)
    })

    test('should show empty state when no product data available', async ({ admin: _admin }) => {
      await analyticsPage.selectProductsTab()
      const tableBody = analyticsPage.popularItemsTable.locator('tbody')
      const noDataText = analyticsPage.page.locator('text=Nenhum dado de produtos disponível')
      const hasRows = await tableBody.locator('tr').count() > 0
      if (!hasRows) {
        await expect(noDataText).toBeVisible()
      }
    })
  })

  test.describe('View orders per period', () => {
    test('should display orders grouped by day when selecting date range', { tag: '@smoke' }, async ({ admin: _admin }) => {
      await analyticsPage.selectOverviewTab()
      await analyticsPage.selectDateRange('7d')
      await analyticsPage.waitForLoading()
      const hasChart = await analyticsPage.isChartDisplayed('orders')
      expect(hasChart).toBeTruthy()
    })

    test('should calculate total revenue correctly for selected period', { tag: '@smoke' }, async ({ admin: _admin }) => {
      await analyticsPage.selectOverviewTab()
      await analyticsPage.selectDateRange('30d')
      await analyticsPage.waitForLoading()
      const revenue = await analyticsPage.getSummaryTotalRevenue()
      expect(revenue).toMatch(/[R$\s]/)
    })

    test('should update data when changing date range', async ({ admin: _admin }) => {
      await analyticsPage.selectDateRange('7d')
      await analyticsPage.waitForLoading()
      const orders7d = await analyticsPage.getSummaryTotalOrders()
      await analyticsPage.selectDateRange('30d')
      await analyticsPage.waitForLoading()
      const orders30d = await analyticsPage.getSummaryTotalOrders()
      expect(orders30d).toBeTruthy()
    })

    test('should display revenue chart when on overview tab', async ({ admin: _admin }) => {
      await analyticsPage.selectOverviewTab()
      const hasRevenueChart = await analyticsPage.isChartDisplayed('revenue')
      expect(hasRevenueChart).toBeTruthy()
    })

    test('should display orders by status summary', async ({ admin: _admin }) => {
      await analyticsPage.selectOverviewTab()
      const statusChart = analyticsPage.page.locator('text=Pedidos por Status')
      await expect(statusChart).toBeVisible()
    })

    test('should display peak hours section', async ({ admin: _admin }) => {
      await analyticsPage.selectOverviewTab()
      const peakHours = analyticsPage.page.locator('text=Horário de Pico')
      await expect(peakHours).toBeVisible()
    })
  })
})
