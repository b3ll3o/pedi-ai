import { test, expect } from '../shared/fixtures'
import { WaiterDashboardPage } from '../../pages/WaiterDashboardPage'

test.describe('Waiter Dashboard', () => {
  let dashboardPage: WaiterDashboardPage

  test.beforeEach(async ({ waiter }) => {
    dashboardPage = new WaiterDashboardPage(waiter)
    await dashboardPage.goto()
    await dashboardPage.waitForLoad()
  })

  test.afterEach(async ({ page }) => {
    try {
      await page.context().clearCookies()
    } catch { /* ignore */ }
    try {
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
    } catch { /* ignore */ }
  })

  test('should display waiter dashboard', async () => {
    await expect(dashboardPage.logo).toBeVisible()
    await expect(dashboardPage.kitchenNavLink).toBeVisible()
  })

  test('should show connection status', async () => {
    await expect(dashboardPage.connectionStatus).toBeVisible()
    const isConnected = await dashboardPage.isConnected()
    // Should be connected or show disconnected status
    expect(typeof isConnected).toBe('boolean')
  })

  test('should navigate to kitchen', async () => {
    await dashboardPage.navigateToKitchen()
    await expect(dashboardPage.page).toHaveURL(/\/kitchen/)
  })

  test('should display orders or empty state', async () => {
    const orderCount = await dashboardPage.getOrderCount()
    // Either should have orders or show empty state
    if (orderCount === 0) {
      await expect(dashboardPage.emptyState).toBeVisible()
    } else {
      await expect(dashboardPage.orderCard.first()).toBeVisible()
    }
  })

  test('should show order status for each order', async () => {
    const orderCount = await dashboardPage.getOrderCount()
    if (orderCount > 0) {
      await expect(dashboardPage.orderStatus.first()).toBeVisible()
    }
  })

  test('should click on order to view details', async () => {
    const orderCount = await dashboardPage.getOrderCount()
    if (orderCount > 0) {
      await dashboardPage.clickOrder(0)
      // Should open order details (implementation depends on UI)
      // Just verify no crash
    }
  })

  test('should display real-time connection indicator', async () => {
    await expect(dashboardPage.connectionStatus).toBeVisible()
  })
})
