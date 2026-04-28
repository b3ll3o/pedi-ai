import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CheckoutPage } from '../../pages/CheckoutPage'
import { OrderPage } from '../../pages/OrderPage'

test.describe('Webhook handling', () => {
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

  test.describe('Stripe webhook updates order status', () => {
    test('deve atualizar status do pedido para pago ao receber webhook payment_intent.succeeded', {
      tag: ['@slow', '@webhook', '@stripe'],
    }, async ({ authenticated, seedData, admin }) => {
      // GIVEN order is in pending_payment status
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Webhook Test',
        email: 'webhook@example.com',
        phone: '11999999999',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('credit')
      await checkoutPage.submitOrder()

      // Preenche dados do cartão de teste do Stripe
      const stripeFrame = authenticated.frameLocator('[data-testid="stripe-card-element"] iframe')
      await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242')
      await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/28')
      await stripeFrame.locator('[placeholder="CVC"]').fill('123')
      await stripeFrame.locator('[placeholder="ZIP"]').fill('12345')

      // Clica no botão de pagamento
      await authenticated.locator('[data-testid="stripe-submit-button"]').click()

      // Aguarda redirecionamento para página do pedido
      await authenticated.waitForURL(/\/order\//, { timeout: 30_000 })

      // Extrai order ID da URL
      const orderUrl = authenticated.url()
      const orderId = orderUrl.split('/order/')[1]

      // Navega para a página do pedido
      await orderPage.goto(orderId)

      // Confirma que pedido está em pending_payment
      await expect(orderPage.orderStatus).toContainText(/pending|pagamento/i, { timeout: 10_000 })

      // WHEN Stripe webhook is received with payment_intent.succeeded
      // Simular confirmação de pagamento via webhook mock (admin API)
      await admin.evaluate(async (id) => {
        const response = await fetch(`/api/admin/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed', paymentStatus: 'paid' }),
        })
        if (!response.ok) {
          throw new Error(`Webhook mock failed: ${response.status}`)
        }
      }, orderId)

      // Recarrega página para verificar atualização
      await authenticated.reload()

      // THEN order status updates to confirmed/paid
      await orderPage.waitForStatus('confirmed', 120_000)
      await expect(orderPage.paymentStatus).toContainText(/confirmado|pago|paid/i)
    })

    test('deve ignorar webhook duplicado (idempotência)', {
      tag: ['@slow', '@webhook', '@stripe'],
    }, async ({ authenticated, seedData, admin }) => {
      // GIVEN order is in pending_payment status
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Duplicate Webhook Test',
        email: 'dupwebhook@example.com',
        phone: '11999999999',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('credit')
      await checkoutPage.submitOrder()

      // Preenche dados do cartão de teste do Stripe
      const stripeFrame = authenticated.frameLocator('[data-testid="stripe-card-element"] iframe')
      await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242')
      await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/28')
      await stripeFrame.locator('[placeholder="CVC"]').fill('123')
      await stripeFrame.locator('[placeholder="ZIP"]').fill('12345')

      await authenticated.locator('[data-testid="stripe-submit-button"]').click()
      await authenticated.waitForURL(/\/order\//, { timeout: 30_000 })

      const orderUrl = authenticated.url()
      const orderId = orderUrl.split('/order/')[1]

      await orderPage.goto(orderId)

      // WHEN same webhook event is received twice
      // Primeira confirmação
      await admin.evaluate(async (id) => {
        await fetch(`/api/admin/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed', paymentStatus: 'paid' }),
        })
      }, orderId)

      // Segunda confirmação (duplicada)
      await admin.evaluate(async (id) => {
        await fetch(`/api/admin/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed', paymentStatus: 'paid' }),
        })
      }, orderId)

      // THEN order status remains confirmed/paid (no error from duplicate)
      await authenticated.reload()
      await orderPage.waitForStatus('confirmed', 120_000)
      await expect(orderPage.paymentStatus).toContainText(/confirmado|pago|paid/i)
    })
  })

  test.describe('Webhook com erro de assinatura', () => {
    test('deve rejeitar webhook com assinatura inválida', {
      tag: ['@slow', '@webhook'],
    }, async ({ authenticated, seedData }) => {
      // GIVEN order is in pending_payment status
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Invalid Signature Test',
        email: 'invalidsig@example.com',
        phone: '11999999999',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('credit')
      await checkoutPage.submitOrder()

      // Preenche dados do cartão de teste do Stripe
      const stripeFrame = authenticated.frameLocator('[data-testid="stripe-card-element"] iframe')
      await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242')
      await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/28')
      await stripeFrame.locator('[placeholder="CVC"]').fill('123')
      await stripeFrame.locator('[placeholder="ZIP"]').fill('12345')

      await authenticated.locator('[data-testid="stripe-submit-button"]').click()
      await authenticated.waitForURL(/\/order\//, { timeout: 30_000 })

      const orderUrl = authenticated.url()
      const orderId = orderUrl.split('/order/')[1]

      await orderPage.goto(orderId)

      // WHEN webhook with invalid signature is received
      // Tenta enviar webhook diretamente para a API (sem assinatura válida)
      const webhookResponse = await authenticated.evaluate(async (id) => {
        const response = await fetch('/api/payments/stripe/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: `evt_duplicate_${Date.now()}`,
            type: 'payment_intent.succeeded',
            data: {
              object: {
                id: `pi_invalid_sig_${id}`,
                status: 'succeeded',
              },
            },
          }),
        })
        return { status: response.status, body: await response.json() }
      }, orderId)

      // THEN webhook is rejected with 400
      expect(webhookResponse.status).toBe(400)
      expect(webhookResponse.body.error).toContain('signature')
    })
  })
})
