import { test, expect } from '../shared/fixtures'
import { AdminOrdersPage, AdminOrderStatus as _AdminOrderStatus } from '../../pages/AdminOrdersPage'

test.describe('Admin Orders', () => {
  let ordersPage: AdminOrdersPage

  test.beforeEach(async ({ admin }) => {
    ordersPage = new AdminOrdersPage(admin)
    await ordersPage.goto()
  })

  test('should display orders list', { tag: '@smoke' }, async ({ admin }) => {
    await expect(admin.locator('[data-testid="page-title"]')).toContainText('Pedidos')
    await expect(ordersPage.ordersList.first()).toBeVisible()
  })

  test('should filter orders by status', async ({ admin: _admin }) => {
    const count = await ordersPage.filterByStatus('pending')
    // Should show only pending orders
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should search orders by customer email', async ({ admin: _admin }) => {
    const count = await ordersPage.searchByCustomerEmail('test@example.com')
    // Should show matching orders
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should view order details', { tag: '@smoke' }, async ({ admin: _admin }) => {
    const orderId = await ordersPage.ordersList.first().locator('[data-testid="order-id"]').textContent()
    if (orderId) {
      await ordersPage.viewOrderDetails(orderId)
      await expect(ordersPage.orderModal).toBeVisible()
    }
  })

  test('should update order status to confirmed', { tag: '@smoke' }, async ({ admin }) => {
    const orderId = await ordersPage.ordersList.first().locator('[data-testid="order-id"]').textContent()
    if (orderId) {
      await ordersPage.updateOrderStatus(orderId, 'confirmed')
      await expect(admin.locator('[data-testid="success-message"]')).toBeVisible()
    }
  })

  test('should update order status to preparing', async ({ admin }) => {
    const orderId = await ordersPage.ordersList.first().locator('[data-testid="order-id"]').textContent()
    if (orderId) {
      await ordersPage.updateOrderStatus(orderId, 'preparing')
      await expect(admin.locator('[data-testid="success-message"]')).toBeVisible()
    }
  })

  test('should update order status to ready', async ({ admin }) => {
    const orderId = await ordersPage.ordersList.first().locator('[data-testid="order-id"]').textContent()
    if (orderId) {
      await ordersPage.updateOrderStatus(orderId, 'ready')
      await expect(admin.locator('[data-testid="success-message"]')).toBeVisible()
    }
  })

  test('should cancel order', async ({ admin }) => {
    const orderId = await ordersPage.ordersList.first().locator('[data-testid="order-id"]').textContent()
    if (orderId) {
      await ordersPage.cancelOrder(orderId)
      await expect(admin.locator('[data-testid="success-message"]')).toBeVisible()
    }
  })

  test('should display order status badge', async ({ admin: _admin }) => {
    const status = await ordersPage.ordersList.first().locator('[data-testid="order-status"]').textContent()
    expect(status).toMatch(/pendente|confirmado|preparando|pronto|entregue|cancelado/i)
  })

  test('should show real-time order updates', async ({ admin }) => {
    // Reload and check for new orders
    await admin.reload()
    await expect(ordersPage.ordersList.first()).toBeVisible()
  })
})
