import { test, expect } from '../shared/fixtures'
import { OrderPage, OrderStatus } from '../../pages/OrderPage'

test.describe('Order', () => {
  test('@smoke', 'should display order tracking information', async ({ guest, seedData }) => {
    const orderPage = new OrderPage(guest)
    await orderPage.goto('test-order-123')

    await expect(orderPage.orderId).toContainText('test-order-123')
    await expect(orderPage.orderStatus).toBeVisible()
    await expect(orderPage.statusTimeline).toBeVisible()
  })

  test('should show order items list', async ({ guest }) => {
    const orderPage = new OrderPage(guest)
    await orderPage.goto('test-order-123')

    const items = await orderPage.getItems()
    expect(items.length).toBeGreaterThan(0)
  })

  test('should display order total', async ({ guest }) => {
    const orderPage = new OrderPage(guest)
    await orderPage.goto('test-order-123')

    const total = await orderPage.getTotal()
    expect(total).toMatch(/R\$\s*[\d,]+/)
  })

  test('@slow', 'should update status in real-time', async ({ guest }) => {
    const orderPage = new OrderPage(guest)
    await orderPage.goto('test-order-123')

    // Wait for status update
    await orderPage.waitForStatus('confirmed', 60_000)
    await expect(orderPage.orderStatus).toContainText(/confirmado|preparando|pronto|entregue/i)
  })

  test('should display payment confirmation', async ({ guest }) => {
    const orderPage = new OrderPage(guest)
    await orderPage.goto('test-order-123')

    const isConfirmed = await orderPage.isPaymentConfirmed()
    expect(typeof isConfirmed).toBe('boolean')
  })

  test('should generate QR code for order', async ({ guest }) => {
    const orderPage = new OrderPage(guest)
    await orderPage.goto('test-order-123')

    const qrCode = await orderPage.getQRCode()
    expect(qrCode).toBeTruthy()
  })

  test('should allow order cancellation when pending', async ({ guest }) => {
    const orderPage = new OrderPage(guest)
    await orderPage.goto('test-order-123')

    // Only pending orders can be cancelled
    const status = await orderPage.getStatus()
    if (status === 'pending') {
      await orderPage.cancelOrder()
      await expect(orderPage.orderStatus).toContainText(/cancelado/i)
    }
  })

  test('@slow', 'should not allow cancellation when preparing', async ({ guest }) => {
    const orderPage = new OrderPage(guest)
    await orderPage.goto('test-order-123')

    // Wait for order to move past pending
    await orderPage.waitForStatus('preparing', 120_000)
    await expect(orderPage.cancelButton).not.toBeVisible()
  })
})
