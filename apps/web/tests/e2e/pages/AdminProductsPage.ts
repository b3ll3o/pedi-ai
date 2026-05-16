import { Page, Locator } from '@playwright/test'

export class AdminProductsPage {
  readonly page: Page
  readonly productsList: Locator
  readonly addProductButton: Locator
  readonly productNameInput: Locator
  readonly productPriceInput: Locator
  readonly productCategorySelect: Locator
  readonly productDescriptionInput: Locator
  readonly productImageInput: Locator
  readonly saveButton: Locator
  readonly deleteButton: Locator
  readonly editButton: Locator
  readonly searchInput: Locator
  readonly filterCategorySelect: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.productsList = page.locator('[data-testid="product-item"]')
    this.addProductButton = page.locator('[data-testid="add-product-button"]')
    this.productNameInput = page.locator('[data-testid="product-name-input"]')
    this.productPriceInput = page.locator('[data-testid="product-price-input"]')
    this.productCategorySelect = page.locator('[data-testid="product-category-select"]')
    this.productDescriptionInput = page.locator('[data-testid="product-description-input"]')
    this.productImageInput = page.locator('[data-testid="product-image-input"]')
    this.saveButton = page.locator('[data-testid="save-button"]')
    this.deleteButton = page.locator('[data-testid="delete-button"]')
    this.editButton = page.locator('[data-testid="edit-button"]')
    this.searchInput = page.locator('[data-testid="search-input"]')
    this.filterCategorySelect = page.locator('[data-testid="filter-category-select"]')
    this.successMessage = page.locator('[data-testid="success-message"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/products')
  }

  async getProductsCount(): Promise<number> {
    return this.productsList.count()
  }

  async searchProducts(query: string): Promise<number> {
    await this.searchInput.fill(query)
    await this.page.waitForResponse(/\/api\/admin\/products/)
    return this.productsList.count()
  }

  async filterByCategory(categoryName: string): Promise<number> {
    await this.filterCategorySelect.selectOption({ label: categoryName })
    await this.page.waitForResponse(/\/api\/admin\/products/)
    return this.productsList.count()
  }

  async addProduct(product: {
    name: string
    price: number
    categoryId: string
    description?: string
    imageUrl?: string
  }): Promise<void> {
    await this.addProductButton.click()
    await this.productNameInput.fill(product.name)
    await this.productPriceInput.fill(product.price.toString())
    await this.productCategorySelect.selectOption(product.categoryId)
    if (product.description) {
      await this.productDescriptionInput.fill(product.description)
    }
    if (product.imageUrl) {
      await this.productImageInput.fill(product.imageUrl)
    }
    await this.saveButton.click()
    await this.successMessage.waitFor({ state: 'visible' })
  }

  async editProduct(oldName: string, newData: { name?: string; price?: number }): Promise<void> {
    const product = this.productsList.filter({ hasText: oldName })
    await product.locator('[data-testid="edit-button"]').click()
    if (newData.name) {
      await this.productNameInput.clear()
      await this.productNameInput.fill(newData.name)
    }
    if (newData.price) {
      await this.productPriceInput.clear()
      await this.productPriceInput.fill(newData.price.toString())
    }
    await this.saveButton.click()
    await this.successMessage.waitFor({ state: 'visible' })
  }

  async deleteProduct(name: string): Promise<void> {
    const product = this.productsList.filter({ hasText: name })
    await product.locator('[data-testid="delete-button"]').click()
    await this.page.locator('[data-testid="confirm-delete-button"]').click()
    await this.successMessage.waitFor({ state: 'visible' })
  }

  async toggleProductAvailability(name: string): Promise<void> {
    const product = this.productsList.filter({ hasText: name })
    await product.locator('[data-testid="toggle-availability"]').click()
  }

  async getError(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? ''
  }
}
