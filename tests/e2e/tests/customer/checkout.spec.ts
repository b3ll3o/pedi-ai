import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CheckoutPage } from '../../pages/CheckoutPage'

test.describe('Checkout', () => {
  let menuPage: MenuPage
  let checkoutPage: CheckoutPage

  test.beforeEach(async ({ guest }) => {
    menuPage = new MenuPage(guest)
    checkoutPage = new CheckoutPage(guest)

    // Add item to cart and go to checkout
    await menuPage.goto()
    await menuPage.addProductToCart('Picanha')
    await checkoutPage.goto()
  })

  test('should display checkout form', async ({ guest }) => {
    await expect(guest.locator('[data-testid="checkout-form"]')).toBeVisible()
    await expect(checkoutPage.nameInput).toBeVisible()
    await expect(checkoutPage.emailInput).toBeVisible()
    await expect(checkoutPage.tableCodeInput).toBeVisible()
  })

  test('should display order summary', async ({ guest }) => {
    await expect(checkoutPage.orderSummary).toBeVisible()
    const total = await checkoutPage.getOrderTotal()
    expect(total).toMatch(/[\d,]+/)
  })

  test('should validate required fields', async ({ guest }) => {
    await checkoutPage.submitOrder()
    await expect(guest.locator('[data-testid="field-error"]').first()).toBeVisible()
  })

  test('should submit order with valid data', { tag: ['@smoke', '@slow'] }, async ({ guest }) => {
    await checkoutPage.fillCustomerInfo({
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '11999999999',
      tableCode: 'TABLE-123',
    })
    await checkoutPage.selectPaymentMethod('pix')
    await checkoutPage.submitOrder()
    await checkoutPage.waitForConfirmation()
    await expect(guest).toHaveURL(/\/order\//)
  })

  test('should accept PIX payment method', async ({ guest }) => {
    await checkoutPage.selectPaymentMethod('pix')
    await expect(guest.locator('[data-testid="pix-info"]')).toBeVisible()
  })

  test('should accept credit card payment method', async ({ guest }) => {
    await checkoutPage.selectPaymentMethod('credit')
    await expect(guest.locator('[data-testid="credit-card-form"]')).toBeVisible()
  })

  test('should calculate total with items', async ({ guest }) => {
    const total = await checkoutPage.getOrderTotal()
    expect(total).toMatch(/R\$\s*[\d,]+/)
  })
})
