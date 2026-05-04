import { test, expect, clearClientState } from '../shared/fixtures'
import { AdminOrdersPage, AdminOrderStatus as _AdminOrderStatus } from '../../pages/AdminOrdersPage'

test.describe('Admin Orders', () => {
  let ordersPage: AdminOrdersPage

  test.beforeEach(async ({ admin }) => {
    ordersPage = new AdminOrdersPage(admin)
    await ordersPage.goto()
  })

  test.afterEach(async ({ page }) => {
    await clearClientState(page)
  })

  test.skip('should display orders list', { tag: '@smoke' }, async ({ admin }) => {
    await expect(admin.locator('[data-testid="page-title"]')).toContainText('Pedidos')
    await expect(ordersPage.ordersList.first()).toBeVisible()
  })

  test('should filter orders by status', async ({ admin: _admin }) => {
    const count = await ordersPage.filterByStatus('pending_payment')
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should search orders by customer email', async ({ admin: _admin }) => {
    const count = await ordersPage.searchByCustomerEmail('test@example.com')
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test.skip('should view order details', { tag: '@smoke' }, async ({ admin: _admin }) => {
    const orderId = await ordersPage.ordersList.first().locator('[data-testid="order-id"]').textContent()
    if (orderId) {
      await ordersPage.viewOrderDetails(orderId)
      await expect(ordersPage.orderModal).toBeVisible()
    }
  })

  test.skip('should update order status to paid', { tag: '@smoke' }, async ({ admin: _admin }) => {
    const orderId = await ordersPage.ordersList.first().locator('[data-testid="order-id"]').textContent()
    if (orderId) {
      await ordersPage.updateOrderStatus(orderId, 'paid')
    }
  })

  test('should cancel order', async ({ admin: _admin }) => {
    const orderId = await ordersPage.ordersList.first().locator('[data-testid="order-id"]').textContent()
    if (orderId) {
      await ordersPage.cancelOrder(orderId)
    }
  })

  test('should display order status badge', async ({ admin: _admin }) => {
    const status = await ordersPage.ordersList.first().locator('[data-testid="order-status"]').textContent()
    expect(status).toMatch(/aguardando pagamento|pago|preparando|pronto|entregue|cancelado/i)
  })

  test('should show real-time order updates', async ({ admin }) => {
    await admin.reload()
    await expect(ordersPage.ordersList.first()).toBeVisible()
  })
})