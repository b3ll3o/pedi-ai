import { Page, Locator } from '@playwright/test'

export class MenuPage {
  readonly page: Page
  readonly categoryTabs: Locator
  readonly productCards: Locator
  readonly searchInput: Locator

  constructor(page: Page) {
    this.page = page
    this.categoryTabs = page.locator('[data-testid^="menu-category-card-"]')
    this.productCards = page.locator('[data-testid="product-card"]')
    this.searchInput = page.locator('[data-testid="search-input"]')
  }

  async goto(categoryId?: string): Promise<void> {
    const url = categoryId ? `/menu/${categoryId}` : '/menu'
    await this.page.goto(url)
  }

  async selectCategory(categoryName: string): Promise<void> {
    await this.categoryTabs.filter({ hasText: categoryName }).click()
  }

  async addProductToCart(productName: string): Promise<void> {
    const productCard = this.productCards.filter({ hasText: productName })
    await productCard.locator('[data-testid="add-to-cart-button"]').click()
  }

  async viewProduct(productName: string): Promise<void> {
    await this.productCards.filter({ hasText: productName }).click()
    await this.page.waitForURL(/\/product\//)
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    // Search is debounced client-side (300ms), wait for debounce
    await this.page.waitForTimeout(400)
  }

  getProductPrice(productName: string): Locator {
    return this.productCards
      .filter({ hasText: productName })
      .locator('[data-testid="product-price"]')
  }

  getProductByName(name: string): Locator {
    return this.productCards.filter({ hasText: name })
  }
}
