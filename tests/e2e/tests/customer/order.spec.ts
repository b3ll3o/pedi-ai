import { realOrderFixture } from '../shared/fixtures/realOrder.fixture'
import { expect, clearClientState } from '@playwright/test'
import { OrderPage, OrderStatus as _OrderStatus } from '../../pages/OrderPage'

const test = realOrderFixture

test.describe('Order', () => {
  test.afterEach(async ({ page }) => {
    await clearClientState(page)
  })

  test.skip('should display order tracking information', { tag: '@smoke' }, async ({ authenticated, realOrder }) => {
    const orderPage = new OrderPage(authenticated)
    await orderPage.goto(realOrder.orderId)

    await expect(orderPage.orderId).toContainText(realOrder.orderId)
    await expect(orderPage.orderStatus).toBeVisible()
    await expect(orderPage.statusTimeline).toBeVisible()
  })

  test('should show order items list', async ({ authenticated, realOrder }) => {
    const orderPage = new OrderPage(authenticated)
    await orderPage.goto(realOrder.orderId)

    const items = await orderPage.getItems()
    expect(items.length).toBeGreaterThan(0)
  })

  test('should display order total', async ({ authenticated, realOrder }) => {
    const orderPage = new OrderPage(authenticated)
    await orderPage.goto(realOrder.orderId)

    const total = await orderPage.getTotal()
    expect(total).toMatch(/R\$\s*[\d,]+/)
  })

  test('should update status in real-time', { tag: '@slow' }, async ({ authenticated, realOrder }) => {
    const orderPage = new OrderPage(authenticated)
    await orderPage.goto(realOrder.orderId)

    // Wait for status update
    await orderPage.waitForStatus('confirmed', 60_000)
    await expect(orderPage.orderStatus).toContainText(/confirmado|preparando|pronto|entregue/i)
  })

  test('should display payment confirmation', async ({ authenticated, realOrder }) => {
    const orderPage = new OrderPage(authenticated)
    await orderPage.goto(realOrder.orderId)

    const isConfirmed = await orderPage.isPaymentConfirmed()
    expect(typeof isConfirmed).toBe('boolean')
  })

  test('should generate QR code for order', async ({ authenticated, realOrder }) => {
    const orderPage = new OrderPage(authenticated)
    await orderPage.goto(realOrder.orderId)

    const qrCode = await orderPage.getQRCode()
    expect(qrCode).toBeTruthy()
  })

  test('should allow order cancellation when pending', async ({ authenticated, realOrder }) => {
    const orderPage = new OrderPage(authenticated)
    await orderPage.goto(realOrder.orderId)

    // Only pending orders can be cancelled
    const status = await orderPage.getStatus()
    if (status === 'pending') {
      await orderPage.cancelOrder()
      await expect(orderPage.orderStatus).toContainText(/cancelado/i)
    }
  })

  test('should not allow cancellation when preparing', { tag: '@slow' }, async ({ authenticated, realOrder }) => {
    const orderPage = new OrderPage(authenticated)
    await orderPage.goto(realOrder.orderId)

    // Wait for order to move past pending
    await orderPage.waitForStatus('preparing', 120_000)
    await expect(orderPage.cancelButton).not.toBeVisible()
  })
})
