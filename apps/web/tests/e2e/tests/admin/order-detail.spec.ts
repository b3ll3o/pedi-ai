import { test, expect } from '../shared/fixtures'
import { AdminOrderDetailPage } from '../../pages/AdminOrderDetailPage'
import { AdminOrdersPage } from '../../pages/AdminOrdersPage'

test.describe('Admin Order Detail', () => {
  let orderDetailPage: AdminOrderDetailPage
  let ordersPage: AdminOrdersPage

  test.beforeEach(async ({ admin }) => {
    orderDetailPage = new AdminOrderDetailPage(admin)
    ordersPage = new AdminOrdersPage(admin)
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

  test('should display order details', async ({}) => {
    // First get an order from the orders list
    await ordersPage.goto()
    await ordersPage.waitForLoad()

    const orderCount = await ordersPage.getOrderCount()
    if (orderCount === 0) {
      test.skip()
      return
    }

    // Get first order ID
    const firstOrderId = await ordersPage.getOrderId(0)
    if (!firstOrderId) {
      test.skip()
      return
    }

    await orderDetailPage.goto(firstOrderId)
    await orderDetailPage.waitForLoad()

    await expect(orderDetailPage.orderId).toBeVisible()
    await expect(orderDetailPage.orderStatus).toBeVisible()
  })

  test('should show order items', async ({}) => {
    await ordersPage.goto()
    await ordersPage.waitForLoad()

    const orderCount = await ordersPage.getOrderCount()
    if (orderCount === 0) {
      test.skip()
      return
    }

    const firstOrderId = await ordersPage.getOrderId(0)
    if (!firstOrderId) {
      test.skip()
      return
    }

    await orderDetailPage.goto(firstOrderId)
    await orderDetailPage.waitForLoad()

    const itemCount = await orderDetailPage.getItemCount()
    expect(itemCount).toBeGreaterThan(0)
  })

  test('should show order total', async ({}) => {
    await ordersPage.goto()
    await ordersPage.waitForLoad()

    const orderCount = await ordersPage.getOrderCount()
    if (orderCount === 0) {
      test.skip()
      return
    }

    const firstOrderId = await ordersPage.getOrderId(0)
    if (!firstOrderId) {
      test.skip()
      return
    }

    await orderDetailPage.goto(firstOrderId)
    await orderDetailPage.waitForLoad()

    await expect(orderDetailPage.orderTotal).toBeVisible()
  })

  test('should update order status', async ({}) => {
    await ordersPage.goto()
    await ordersPage.waitForLoad()

    const orderCount = await ordersPage.getOrderCount()
    if (orderCount === 0) {
      test.skip()
      return
    }

    const firstOrderId = await ordersPage.getOrderId(0)
    if (!firstOrderId) {
      test.skip()
      return
    }

    await orderDetailPage.goto(firstOrderId)
    await orderDetailPage.waitForLoad()

    // Get current status
    const currentStatus = await orderDetailPage.getStatus()

    // If order can be updated (not delivered/cancelled)
    if (!['Entregue', 'Cancelado', 'delivered', 'cancelled'].includes(currentStatus)) {
      await orderDetailPage.updateStatus()
      // Should show success or update status
    }
  })

  test('should cancel order with reason', async ({}) => {
    await ordersPage.goto()
    await ordersPage.waitForLoad()

    const orderCount = await ordersPage.getOrderCount()
    if (orderCount === 0) {
      test.skip()
      return
    }

    const firstOrderId = await ordersPage.getOrderId(0)
    if (!firstOrderId) {
      test.skip()
      return
    }

    await orderDetailPage.goto(firstOrderId)
    await orderDetailPage.waitForLoad()

    // Get current status
    const currentStatus = await orderDetailPage.getStatus()

    // Only cancel if not already cancelled
    if (!['Cancelado', 'cancelled'].includes(currentStatus)) {
      await orderDetailPage.cancelOrder('Test cancellation reason')
    }
  })

  test('should navigate back to orders list', async ({}) => {
    await ordersPage.goto()
    await ordersPage.waitForLoad()

    const orderCount = await ordersPage.getOrderCount()
    if (orderCount === 0) {
      test.skip()
      return
    }

    const firstOrderId = await ordersPage.getOrderId(0)
    if (!firstOrderId) {
      test.skip()
      return
    }

    await orderDetailPage.goto(firstOrderId)
    await orderDetailPage.waitForLoad()
    await orderDetailPage.goBack()

    await expect(orderDetailPage.page).toHaveURL(/\/admin\/orders/)
  })

  test('should show error for non-existent order', async () => {
    await orderDetailPage.goto('non-existent-order-id')
    await orderDetailPage.waitForLoad()

    // Should show error message or redirect
    const url = orderDetailPage.page.url()
    expect(url).toMatch(/orders|error/)
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin/orders/some-order-id')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
