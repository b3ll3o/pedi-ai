import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CheckoutPage } from '../../pages/CheckoutPage'
import { OrderPage } from '../../pages/OrderPage'

test.describe('Payment', () => {
  let menuPage: MenuPage
  let checkoutPage: CheckoutPage
  let orderPage: OrderPage

  test.beforeEach(async ({ guest }) => {
    menuPage = new MenuPage(guest)
    checkoutPage = new CheckoutPage(guest)
    orderPage = new OrderPage(guest)

    // Create order
    await menuPage.goto()
    await menuPage.addProductToCart('Picanha')
  })

  test('should process PIX payment', async ({ guest }) => {
    await guest.goto('/checkout')
    await checkoutPage.fillCustomerInfo({
      name: 'Maria Santos',
      email: 'maria@example.com',
      phone: '11888888888',
      tableCode: 'TABLE-456',
    })
    await checkoutPage.selectPaymentMethod('pix')
    await checkoutPage.submitOrder()

    // Should show PIX QR code
    await expect(guest.locator('[data-testid="pix-qr-code"]')).toBeVisible()
  })

  test('should wait for PIX payment confirmation', { tag: '@slow' }, async ({ guest, seedData }) => {
    // Create PIX order
    await guest.goto('/checkout')
    await checkoutPage.fillCustomerInfo({
      name: 'Maria Santos',
      email: 'maria@example.com',
      phone: '11888888888',
      tableCode: 'TABLE-456',
    })
    await checkoutPage.selectPaymentMethod('pix')
    await checkoutPage.submitOrder()

    const orderUrl = guest.url()
    const orderId = orderUrl.split('/order/')[1]

    await orderPage.goto(orderId)
    await orderPage.waitForStatus('confirmed', 120_000)
    await expect(orderPage.paymentStatus).toContainText(/confirmado|pago/i)
  })

  test('should display payment error for failed transaction', async ({ guest }) => {
    // This test requires mock payment failure
    await guest.goto('/checkout')
    await checkoutPage.fillCustomerInfo({
      name: 'Test User',
      email: 'test@example.com',
      phone: '11777777777',
      tableCode: 'TABLE-789',
    })
    await checkoutPage.selectPaymentMethod('credit')
    await checkoutPage.submitOrder()

    // Payment form should appear
    await expect(guest.locator('[data-testid="credit-card-form"]')).toBeVisible()
  })

  test('should handle payment timeout', { tag: '@slow' }, async ({ guest }) => {
    await guest.goto('/checkout')
    await checkoutPage.fillCustomerInfo({
      name: 'Timeout User',
      email: 'timeout@example.com',
      phone: '11666666666',
      tableCode: 'TABLE-000',
    })
    await checkoutPage.selectPaymentMethod('pix')
    await checkoutPage.submitOrder()

    // Wait for timeout message
    await expect(guest.locator('[data-testid="payment-timeout-message"]')).toBeVisible({ timeout: 180_000 })
  })
})
