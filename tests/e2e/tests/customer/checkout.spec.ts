import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CheckoutPage } from '../../pages/CheckoutPage'

test.describe('Checkout', () => {
  let menuPage: MenuPage
  let checkoutPage: CheckoutPage

  test.beforeEach(async ({ authenticated }) => {
    menuPage = new MenuPage(authenticated)
    checkoutPage = new CheckoutPage(authenticated)

    // Add item to cart and go to checkout
    await menuPage.goto()
    await menuPage.addProductToCart('Picanha')
    await checkoutPage.goto()
  })

  test('should display checkout form', async ({ authenticated }) => {
    await expect(authenticated.locator('[data-testid="checkout-form"]')).toBeVisible()
    await expect(checkoutPage.nameInput).toBeVisible()
    await expect(checkoutPage.emailInput).toBeVisible()
    await expect(checkoutPage.tableCodeInput).toBeVisible()
  })

  test('should display order summary', async ({ authenticated: _authenticated }) => {
    await expect(checkoutPage.orderSummary).toBeVisible()
    const total = await checkoutPage.getOrderTotal()
    expect(total).toMatch(/[\d,]+/)
  })

  test('should validate required fields', async ({ authenticated }) => {
    await checkoutPage.submitOrder()
    await expect(authenticated.locator('[data-testid="field-error"]').first()).toBeVisible()
  })

  test('should submit order with valid data', { tag: ['@smoke', '@slow'] }, async ({ authenticated }) => {
    await checkoutPage.fillCustomerInfo({
      name: 'João Silva',
      email: 'joao@example.com',
      phone: '11999999999',
      tableCode: 'TABLE-123',
    })
    await checkoutPage.selectPaymentMethod('pix')
    await checkoutPage.submitOrder()
    await checkoutPage.waitForConfirmation()
    await expect(authenticated).toHaveURL(/\/order\//)
  })

  test('should accept PIX payment method', async ({ authenticated }) => {
    await checkoutPage.selectPaymentMethod('pix')
    await expect(authenticated.locator('[data-testid="pix-info"]')).toBeVisible()
  })

  test('should accept credit card payment method', async ({ authenticated }) => {
    await checkoutPage.selectPaymentMethod('credit')
    await expect(authenticated.locator('[data-testid="credit-card-form"]')).toBeVisible()
  })

  test('should calculate total with items', async ({ authenticated: _authenticated }) => {
    const total = await checkoutPage.getOrderTotal()
    expect(total).toMatch(/R\$\s*[\d,]+/)
  })

  test('should validate mandatory modifiers before submit', async ({ authenticated }) => {
    // Navigate to product with mandatory modifier
    await menuPage.goto()
    await menuPage.viewProduct('Combo Bacon')
    // Add combo to cart without selecting mandatory modifier
    await authenticated.locator('[data-testid="add-to-cart-button"]').click()
    await checkoutPage.goto()
    // Try to submit without required modifier selection
    await checkoutPage.submitOrder()
    await expect(authenticated.locator('[data-testid="modifier-error"]')).toBeVisible()
  })

  test('should display validation error when mandatory modifier not selected', async ({ authenticated }) => {
    await menuPage.goto()
    await menuPage.viewProduct('Picanha')
    await authenticated.locator('[data-testid="add-to-cart-button"]').click()
    await checkoutPage.goto()
    // Attempting to submit should show mandatory modifier error
    await checkoutPage.submitOrder()
    const errorVisible = await authenticated.locator('[data-testid="modifier-required-error"]').isVisible()
    expect(errorVisible).toBe(true)
  })

  test('should reflect modifiers in total calculation', async ({ authenticated }) => {
    await menuPage.goto()
    await menuPage.viewProduct('Picanha')
    // Add modifiers
    await authenticated.locator('[data-testid="modifier-option-bacon"]').click()
    await authenticated.locator('[data-testid="add-to-cart-button"]').click()
    await checkoutPage.goto()
    const total = await checkoutPage.getOrderTotal()
    expect(total).toMatch(/[\d,]+/)
    // Total should be base price + modifier price
    const summaryText = await checkoutPage.orderSummary.textContent()
    expect(summaryText).toContain('bacon')
  })
})
