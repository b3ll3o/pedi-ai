import { test, expect, clearClientState } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CheckoutPage } from '../../pages/CheckoutPage'
import { OrderPage } from '../../pages/OrderPage'

test.describe('Pagamento Pix', () => {
  let menuPage: MenuPage
  let checkoutPage: CheckoutPage
  let orderPage: OrderPage

  test.beforeEach(async ({ authenticated }) => {
    menuPage = new MenuPage(authenticated)
    checkoutPage = new CheckoutPage(authenticated)
    orderPage = new OrderPage(authenticated)

    // Adicionar item ao carrinho
    await menuPage.goto()
    await menuPage.addProductToCart('Picanha')
  })

  test.afterEach(async ({ page }) => {
    await clearClientState(page)
  })

  test.describe('Fluxo completo de pagamento Pix', () => {
    test('deve exibir QR code Pix ao confirmar pedido com pagamento Pix', async ({ authenticated, seedData }) => {
      // GIVEN customer has items in cart and selects Pix payment
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '11888888888',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('pix')

      // WHEN order is confirmed
      await checkoutPage.submitOrder()

      // THEN system displays Pix QR code
      await expect(authenticated.locator('[data-testid="pix-qr-code"]')).toBeVisible()
      await expect(authenticated.locator('[data-testid="pix-expiration"]')).toBeVisible()
    })

    test('deve confirmar pagamento Pix via polling e atualizar status do pedido', {
      tag: ['@slow', '@pix'],
    }, async ({ authenticated, seedData, admin }) => {
      // GIVEN customer has items in cart and selects Pix payment
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '11888888888',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('pix')
      await checkoutPage.submitOrder()

      // Extract order ID from URL
      const orderUrl = authenticated.url()
      const orderId = orderUrl.split('/order/')[1]

      // Navigate to order page
      await orderPage.goto(orderId)

      // AND system polls for payment confirmation
      // Simular confirmação Pix via API admin
      await admin.evaluate(async (id) => {
        const response = await fetch(`/api/admin/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed' }),
        })
        if (!response.ok) {
          throw new Error(`Mock webhook failed: ${response.status}`)
        }
      }, orderId)

      // Reload page and verify status
      await authenticated.reload()

      // AND upon confirmation, order status updates to paid
      await orderPage.waitForStatus('confirmed', 120_000)
      await expect(orderPage.paymentStatus).toContainText(/confirmado|pago/i)
    })
  })

  test.describe('Timeout de pagamento Pix', () => {
    test('deve exibir mensagem de timeout quando pagamento Pix expira', {
      tag: ['@slow', '@pix'],
    }, async ({ authenticated, seedData }) => {
      // GIVEN customer has initiated Pix payment
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Timeout User',
        email: 'timeout@example.com',
        phone: '11666666666',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('pix')
      await checkoutPage.submitOrder()

      // WHEN 60 seconds elapse without confirmation
      // THEN system displays timeout message
      // O timeout real é de 120 segundos conforme requisito 1.4.4
      await expect(authenticated.locator('[data-testid="payment-timeout-message"]')).toBeVisible({
        timeout: 130_000,
      })

      // AND customer can retry or cancel
      await expect(authenticated.locator('[data-testid="retry-payment-button"]')).toBeVisible()
      await expect(authenticated.locator('[data-testid="cancel-order-button"]')).toBeVisible()
    })

    test('deve permitir cancelar pedido após timeout de pagamento', {
      tag: ['@slow', '@pix'],
    }, async ({ authenticated, seedData }) => {
      // GIVEN customer has initiated Pix payment that timed out
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Timeout User',
        email: 'timeout@example.com',
        phone: '11666666666',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('pix')
      await checkoutPage.submitOrder()

      // Aguardar timeout
      await expect(authenticated.locator('[data-testid="payment-timeout-message"]')).toBeVisible({
        timeout: 130_000,
      })

      // WHEN customer cancels after timeout
      await authenticated.locator('[data-testid="cancel-order-button"]').click()
      await authenticated.locator('[data-testid="confirm-cancel-button"]').click()

      // THEN system redirects to menu
      await expect(authenticated).toHaveURL(/\/menu/)
    })
  })
})
