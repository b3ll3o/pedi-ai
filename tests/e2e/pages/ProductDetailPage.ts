import { Page, Locator } from '@playwright/test'

export class ProductDetailPage {
  readonly page: Page
  readonly loading: Locator
  readonly productName: Locator
  readonly productDescription: Locator
  readonly productPrice: Locator
  readonly productImage: Locator
  readonly addToCartButton: Locator
  readonly quantitySelector: Locator
  readonly modifiersSection: Locator
  readonly modifierOption: Locator
  readonly successToast: Locator
  readonly errorToast: Locator
  readonly cartIndicator: Locator
  readonly backLink: Locator

  constructor(page: Page) {
    this.page = page
    this.loading = page.locator('[data-testid="loading"]')
    this.productName = page.locator('[data-testid="product-name"]')
    this.productDescription = page.locator('[data-testid="product-description"]')
    this.productPrice = page.locator('[data-testid="product-price"]')
    this.productImage = page.locator('[data-testid="product-image"]')
    this.addToCartButton = page.locator('[data-testid="add-to-cart-button"]')
    this.quantitySelector = page.locator('[data-testid="quantity-selector"]')
    this.modifiersSection = page.locator('[data-testid="modifiers-section"]')
    this.modifierOption = page.locator('[data-testid="modifier-option"]')
    this.successToast = page.locator('[data-testid="toast-success"]')
    this.errorToast = page.locator('[data-testid="toast-error"]')
    this.cartIndicator = page.locator('[data-testid="cart-indicator"]')
    this.backLink = page.locator('[data-testid="back-link"]')
  }

  async goto(restaurantId: string, productId: string): Promise<void> {
    await this.page.goto(`/restaurantes/${restaurantId}/produto/${productId}`)
  }

  async gotoByUrl(productUrl: string): Promise<void> {
    await this.page.goto(productUrl)
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await this.productName.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      // Product may not load in offline scenario
    })
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click()
  }

  async getQuantity(): Promise<number> {
    const quantityText = await this.quantitySelector.textContent()
    return parseInt(quantityText ?? '1', 10)
  }

  async setQuantity(quantity: number): Promise<void> {
    const incrementButton = this.quantitySelector.locator('[data-testid="increment-button"]')
    const decrementButton = this.quantitySelector.locator('[data-testid="decrement-button"]')

    const currentQty = await this.getQuantity()
    const diff = quantity - currentQty

    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        await incrementButton.click()
      }
    } else if (diff < 0) {
      for (let i = 0; i < Math.abs(diff); i++) {
        await decrementButton.click()
      }
    }
  }

  async selectModifier(modifierName: string): Promise<void> {
    const modifier = this.modifierOption.filter({ hasText: modifierName })
    await modifier.click()
  }

  async getProductPrice(): Promise<string> {
    return this.productPrice.textContent() ?? ''
  }

  async waitForSuccessToast(): Promise<void> {
    await this.successToast.waitFor({ state: 'visible', timeout: 5000 })
  }

  async waitForErrorToast(): Promise<void> {
    await this.errorToast.waitFor({ state: 'visible', timeout: 5000 })
  }

  async goBack(): Promise<void> {
    await this.backLink.click()
  }
}
