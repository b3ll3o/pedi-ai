import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CartPage } from '../../pages/CartPage'

test.describe('Cart', () => {
  let menuPage: MenuPage
  let _cartPage: CartPage

  test.beforeEach(async ({ guest }) => {
    menuPage = new MenuPage(guest)
    _cartPage = new CartPage(guest)

    // Add items to cart before each test
    await menuPage.goto()
    await menuPage.addProductToCart('Coca-Cola')
    await menuPage.addProductToCart('Picanha')
  })

  test('should display cart with added items', async ({ guest }) => {
    const cart = new CartPage(guest)
    await cart.goto()

    await expect(cart.cartItems).toHaveCount(2)
    await expect(cart.cartItems.filter({ hasText: 'Coca-Cola' })).toBeVisible()
    await expect(cart.cartItems.filter({ hasText: 'Picanha' })).toBeVisible()
  })

  test('should update item quantity', async ({ guest }) => {
    const cart = new CartPage(guest)
    await cart.goto()

    await cart.updateQuantity('Coca-Cola', 3)
    await expect(cart.cartItems.filter({ hasText: 'Coca-Cola' }).locator('[data-testid="quantity-input"]')).toHaveValue('3')
  })

  test('should remove item from cart', async ({ guest }) => {
    const cart = new CartPage(guest)
    await cart.goto()

    await cart.removeItem('Coca-Cola')
    await expect(cart.cartItems.filter({ hasText: 'Coca-Cola' })).not.toBeVisible()
  })

  test('should calculate cart total correctly', async ({ guest }) => {
    const cart = new CartPage(guest)
    await cart.goto()

    const total = await cart.getTotal()
    expect(total).toMatch(/R\$\s*[\d,]+/)
  })

  test('should clear entire cart', async ({ guest }) => {
    const cart = new CartPage(guest)
    await cart.goto()

    await cart.clearCart()
    await expect(guest.locator('[data-testid="empty-cart-message"]')).toBeVisible()
  })

  test('should proceed to checkout', async ({ guest }) => {
    const cart = new CartPage(guest)
    await cart.goto()

    await cart.proceedToCheckout()
    await expect(guest).toHaveURL('/checkout')
  })
})
