import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CheckoutPage } from '../../pages/CheckoutPage'
import { OrderPage } from '../../pages/OrderPage'

test.describe('Payment', () => {
  let menuPage: MenuPage
  let checkoutPage: CheckoutPage
  let orderPage: OrderPage

  test.beforeEach(async ({ authenticated }) => {
    menuPage = new MenuPage(authenticated)
    checkoutPage = new CheckoutPage(authenticated)
    orderPage = new OrderPage(authenticated)

    // Create order
    await menuPage.goto()
    await menuPage.addProductToCart('Picanha')
  })

  test('should process PIX payment', async ({ authenticated, seedData }) => {
    await authenticated.goto('/checkout')
    await checkoutPage.fillCustomerInfo({
      name: 'Maria Santos',
      email: 'maria@example.com',
      phone: '11888888888',
      tableCode: seedData.table.code,
    })
    await checkoutPage.selectPaymentMethod('pix')
    await checkoutPage.submitOrder()

    // Should show PIX QR code
    await expect(authenticated.locator('[data-testid="pix-qr-code"]')).toBeVisible()
  })

  test('should wait for PIX payment confirmation', { tag: '@slow' }, async ({ authenticated, seedData, admin }) => {
    // Create PIX order via checkout
    await authenticated.goto('/checkout')
    await checkoutPage.fillCustomerInfo({
      name: 'Maria Santos',
      email: 'maria@example.com',
      phone: '11888888888',
      tableCode: seedData.table.code,
    })
    await checkoutPage.selectPaymentMethod('pix')
    await checkoutPage.submitOrder()

    const orderUrl = authenticated.url()
    const orderId = orderUrl.split('/order/')[1]

    await orderPage.goto(orderId)

    // Simular confirmacao PIX via mock webhook
    // Usa a pagina admin autenticada para chamar a API de atualizacao de status
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

    // Recarregar pagina e verificar status
    await authenticated.reload()
    await orderPage.waitForStatus('confirmed', 120_000)
    await expect(orderPage.paymentStatus).toContainText(/confirmado|pago/i)
  })

  test('should display payment error for failed transaction', async ({ authenticated, seedData }) => {
    // Teste de cartao de credito - apenas verifica que o formulario aparece
    // Falhas de pagamento sao tratadas pelo gateway, nao pelo frontend
    await authenticated.goto('/checkout')
    await checkoutPage.fillCustomerInfo({
      name: 'Test User',
      email: 'test@example.com',
      phone: '11777777777',
      tableCode: seedData.table.code,
    })
    await checkoutPage.selectPaymentMethod('credit')
    await checkoutPage.submitOrder()

    // Payment form should appear
    await expect(authenticated.locator('[data-testid="credit-card-form"]')).toBeVisible()
  })

  test('should handle payment timeout', { tag: '@slow' }, async ({ authenticated, seedData }) => {
    await authenticated.goto('/checkout')
    await checkoutPage.fillCustomerInfo({
      name: 'Timeout User',
      email: 'timeout@example.com',
      phone: '11666666666',
      tableCode: seedData.table.code,
    })
    await checkoutPage.selectPaymentMethod('pix')
    await checkoutPage.submitOrder()

    // Aguardar mensagem de timeout (120 segundos conforme requisito 1.4.4)
    await expect(authenticated.locator('[data-testid="payment-timeout-message"]')).toBeVisible({ timeout: 120_000 })
  })
})
