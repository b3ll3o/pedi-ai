import { Page, Locator, expect } from '@playwright/test'

export class CartPage {
  readonly page: Page
  readonly cartItems: Locator
  readonly cartTotal: Locator
  readonly checkoutButton: Locator
  readonly emptyCartMessage: Locator
  readonly quantityInputs: Locator

  constructor(page: Page) {
    this.page = page
    this.cartItems = page.locator('[data-testid="cart-item"]')
    this.cartTotal = page.locator('[data-testid="cart-total"]')
    this.checkoutButton = page.locator('[data-testid="checkout-button"]')
    this.emptyCartMessage = page.locator('[data-testid="empty-cart-message"]')
    this.quantityInputs = page.locator('[data-testid="quantity-input"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/cart')
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count()
  }

  async updateQuantity(productName: string, quantity: number): Promise<void> {
    const item = this.cartItems.filter({ hasText: productName })
    const input = item.locator('[data-testid="quantity-input"]')
    await input.fill(quantity.toString())
    await this.page.waitForResponse(/\/api\/cart/)
  }

  async removeItem(productName: string): Promise<void> {
    const item = this.cartItems.filter({ hasText: productName })
    await item.locator('[data-testid="cart-item-remove"]').click()
    await this.page.waitForResponse(/\/api\/cart/)
  }

  async clearCart(): Promise<void> {
    const count = await this.getItemCount()
    for (let i = 0; i < count; i++) {
      await this.cartItems.first().locator('[data-testid="cart-item-remove"]').click()
      await this.page.waitForTimeout(300)
    }
  }

  async getItemPrice(productName: string): Promise<string> {
    const item = this.cartItems.filter({ hasText: productName })
    return (await item.locator('[data-testid="item-price"]').textContent()) ?? ''
  }

  async getTotal(): Promise<string> {
    return (await this.cartTotal.textContent()) ?? ''
  }

  async proceedToCheckout(): Promise<void> {
    await this.checkoutButton.click()
    await this.page.waitForURL('/checkout')
  }
}
