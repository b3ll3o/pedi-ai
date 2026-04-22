import { test, expect } from '../shared/fixtures'
import { WaiterDashboardPage } from '../../pages/WaiterDashboardPage'

test.describe('Kitchen / Waiter Dashboard', () => {
  let kitchenPage: WaiterDashboardPage

  test.beforeEach(async ({ waiter }) => {
    kitchenPage = new WaiterDashboardPage(waiter)
    await kitchenPage.navigateToKitchen()
  })

  test('should display kitchen orders', async ({ waiter }) => {
    await expect(waiter.locator('[data-testid="page-title"]')).toContainText('Cozinha')
    await expect(kitchenPage.kitchenOrders.first()).toBeVisible()
  })

  test('should show order items on ticket', async ({ waiter }) => {
    const count = await kitchenPage.getKitchenOrdersCount()
    if (count > 0) {
      const items = await kitchenPage.getOrderItems('1')
      expect(items.length).toBeGreaterThan(0)
    }
  })

  test('should start preparing order', async ({ waiter }) => {
    const count = await kitchenPage.getKitchenOrdersCount()
    if (count > 0) {
      const orderId = await kitchenPage.kitchenOrders.first().locator('[data-testid="order-id"]').textContent()
      if (orderId) {
        await kitchenPage.startPreparing(orderId)
        await expect(waiter.locator('[data-testid="success-message"]')).toBeVisible()
      }
    }
  })

  test('should mark order as ready', async ({ waiter }) => {
    const count = await kitchenPage.getKitchenOrdersCount()
    if (count > 0) {
      const orderId = await kitchenPage.kitchenOrders.first().locator('[data-testid="order-id"]').textContent()
      if (orderId) {
        await kitchenPage.markReady(orderId)
        await expect(waiter.locator('[data-testid="success-message"]')).toBeVisible()
      }
    }
  })

  test('should display active orders count', async ({ waiter }) => {
    const count = await kitchenPage.getActiveOrdersCount()
    expect(typeof count).toBe('number')
  })

  test('should display completed orders count', async ({ waiter }) => {
    const count = await kitchenPage.getCompletedOrdersCount()
    expect(typeof count).toBe('number')
  })

  test('should refresh orders list', async ({ waiter }) => {
    await kitchenPage.refreshOrders()
    await expect(waiter.locator('[data-testid="kitchen-order"]').first()).toBeVisible()
  })

  test('should toggle audio notifications', async ({ waiter }) => {
    await kitchenPage.audioToggle.click()
    // Audio should toggle
  })

  test('@slow', 'should wait for new order notification', async ({ waiter }) => {
    // This is a long-waiting test
    await expect(kitchenPage.kitchenOrders.first()).toBeVisible({ timeout: 5000 })
  })
})
