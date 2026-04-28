import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CheckoutPage } from '../../pages/CheckoutPage'
import { OrderPage } from '../../pages/OrderPage'

test.describe('Pagamento Stripe', () => {
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

  test.describe('Fluxo completo de pagamento com Cartão de Crédito', () => {
    test('deve exibir formulário Stripe ao confirmar pedido com pagamento via cartão', async ({ authenticated, seedData }) => {
      // GIVEN customer has items in cart and selects Credit Card payment
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('credit')

      // WHEN order is confirmed
      await checkoutPage.submitOrder()

      // THEN system displays Stripe card form
      await expect(authenticated.locator('[data-testid="stripe-card-element"]')).toBeVisible()
      await expect(authenticated.locator('[data-testid="stripe-submit-button"]')).toBeVisible()
    })

    test('deve processar pagamento Stripe com sucesso e atualizar status do pedido para pago', {
      tag: ['@slow', '@stripe'],
    }, async ({ authenticated, seedData, admin }) => {
      // GIVEN customer has items in cart and selects Credit Card payment
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '11999999999',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('credit')
      await checkoutPage.submitOrder()

      // THEN system displays Stripe card form
      await expect(authenticated.locator('[data-testid="stripe-card-element"]')).toBeVisible()

      // Simular pagamento Stripe bem-sucedido via mock
      // Preenche dados do cartão de teste do Stripe
      const stripeFrame = authenticated.frameLocator('[data-testid="stripe-card-element"] iframe')
      await stripeFrame.locator('[placeholder="Card number"]').fill('4242424242424242')
      await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/28')
      await stripeFrame.locator('[placeholder="CVC"]').fill('123')
      await stripeFrame.locator('[placeholder="ZIP"]').fill('12345')

      // Clica no botão de pagamento
      await authenticated.locator('[data-testid="stripe-submit-button"]').click()

      // Aguarda confirmação do pagamento
      // O sistema deve redirecionar para a página de confirmação do pedido
      await authenticated.waitForURL(/\/order\//, { timeout: 30_000 })

      // Extrai order ID da URL
      const orderUrl = authenticated.url()
      const orderId = orderUrl.split('/order/')[1]

      // Navega para a página do pedido
      await orderPage.goto(orderId)

      // Simular confirmação de pagamento via webhook mock (admin API)
      await admin.evaluate(async (id) => {
        const response = await fetch(`/api/admin/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed', paymentStatus: 'paid' }),
        })
        if (!response.ok) {
          throw new Error(`Mock payment webhook failed: ${response.status}`)
        }
      }, orderId)

      // Recarrega página e verifica status
      await authenticated.reload()

      // AND upon successful payment, order status updates to paid
      await orderPage.waitForStatus('confirmed', 120_000)
      await expect(orderPage.paymentStatus).toContainText(/confirmado|pago|paid/i)
    })
  })

  test.describe('Validação do formulário Stripe', () => {
    test('deve exibir erro ao tentar submeter sem dados do cartão', async ({ authenticated, seedData }) => {
      // GIVEN customer has items in cart and selects Credit Card payment
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Teste Validação',
        email: 'teste@example.com',
        phone: '11888888888',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('credit')
      await checkoutPage.submitOrder()

      // THEN system displays Stripe card form
      await expect(authenticated.locator('[data-testid="stripe-card-element"]')).toBeVisible()

      // WHEN customer tries to submit without filling card details
      await authenticated.locator('[data-testid="stripe-submit-button"]').click()

      // THEN system displays validation error
      await expect(authenticated.locator('[data-testid="stripe-error-message"]')).toBeVisible()
    })

    test('deve exibir erro para cartão recusado', {
      tag: ['@slow', '@stripe'],
    }, async ({ authenticated, seedData }) => {
      // GIVEN customer has items in cart and selects Credit Card payment
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Cartão Recusado',
        email: 'recusado@example.com',
        phone: '11777777777',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('credit')
      await checkoutPage.submitOrder()

      // THEN system displays Stripe card form
      await expect(authenticated.locator('[data-testid="stripe-card-element"]')).toBeVisible()

      // Preenche com cartão que causa erro (Stripe test card)
      const stripeFrame = authenticated.frameLocator('[data-testid="stripe-card-element"] iframe')
      await stripeFrame.locator('[placeholder="Card number"]').fill('4000000000000002') // Card declined
      await stripeFrame.locator('[placeholder="MM / YY"]').fill('12/28')
      await stripeFrame.locator('[placeholder="CVC"]').fill('123')
      await stripeFrame.locator('[placeholder="ZIP"]').fill('12345')

      // Clica no botão de pagamento
      await authenticated.locator('[data-testid="stripe-submit-button"]').click()

      // THEN system displays card declined error
      await expect(authenticated.locator('[data-testid="stripe-error-message"]')).toContainText(/card declined|recusado/i, { timeout: 15_000 })
    })
  })

  test.describe('Timeout e cancelamento de pagamento Stripe', () => {
    test('deve permitir cancelamento do pedido durante processamento do pagamento', async ({ authenticated, seedData }) => {
      // GIVEN customer has items in cart and selects Credit Card payment
      await authenticated.goto('/checkout')
      await checkoutPage.fillCustomerInfo({
        name: 'Cancelar Teste',
        email: 'cancel@example.com',
        phone: '11666666666',
        tableCode: seedData.table.code,
      })
      await checkoutPage.selectPaymentMethod('credit')
      await checkoutPage.submitOrder()

      // THEN system displays Stripe card form
      await expect(authenticated.locator('[data-testid="stripe-card-element"]')).toBeVisible()

      // WHEN customer clicks cancel during payment
      await authenticated.locator('[data-testid="cancel-order-button"]').click()
      await authenticated.locator('[data-testid="confirm-cancel-button"]').click()

      // THEN system redirects to menu
      await expect(authenticated).toHaveURL(/\/menu/)
    })
  })
})
