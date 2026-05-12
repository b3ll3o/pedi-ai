import { test, expect, clearClientState } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CheckoutPage } from '../../pages/CheckoutPage'

test.describe('Checkout sem pagamento (MVP)', () => {
  let menuPage: MenuPage
  let checkoutPage: CheckoutPage

  test.beforeEach(async ({ authenticated }) => {
    menuPage = new MenuPage(authenticated)
    checkoutPage = new CheckoutPage(authenticated)

    await menuPage.goto()
    await menuPage.selectCategory('Bebidas')
    await menuPage.addProductToCart('Coca-Cola')
    await checkoutPage.goto()
  })

  test.afterEach(async ({ page }) => {
    await clearClientState(page)
  })

  test('não deve exibir seleção de método de pagamento', async ({ authenticated }) => {
    await expect(authenticated.locator('[data-testid="payment-method-pix"]')).not.toBeVisible()
    await expect(authenticated.locator('[data-testid="payment-method-card"]')).not.toBeVisible()
  })

  test('deve exibir botão "Enviar Pedido" (não "Finalizar Pedido")', async ({ authenticated }) => {
    const submitButton = authenticated.locator('[data-testid="checkout-submit"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toHaveText(/enviar/i)
  })

  test('deve redirecionar para /pedido/{id} após envio', async ({ authenticated }) => {
    await checkoutPage.fillCustomerInfo({
      name: 'João Silva',
      phone: '11999999999',
    })
    await checkoutPage.submitOrder()
    await expect(authenticated).toHaveURL(/\/pedido\/.+/)
  })

  test('deve mostrar status "recebido" na página de pedido', async ({ authenticated }) => {
    await checkoutPage.fillCustomerInfo({
      name: 'João Silva',
      phone: '11999999999',
    })
    await checkoutPage.submitOrder()
    await expect(authenticated).toHaveURL(/\/pedido\/.+/)

    await expect(authenticated.locator('[data-testid="order-status"]')).toContainText(/recebido/i)
  })
})
