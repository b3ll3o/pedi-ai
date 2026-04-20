import { Page, Locator, expect } from '@playwright/test'

export class AdminCategoriesPage {
  readonly page: Page
  readonly categoriesList: Locator
  readonly addCategoryButton: Locator
  readonly categoryNameInput: Locator
  readonly categoryDescriptionInput: Locator
  readonly saveButton: Locator
  readonly deleteButton: Locator
  readonly editButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.categoriesList = page.locator('[data-testid="category-item"]')
    this.addCategoryButton = page.locator('[data-testid="add-category-button"]')
    this.categoryNameInput = page.locator('[data-testid="category-name-input"]')
    this.categoryDescriptionInput = page.locator('[data-testid="category-description-input"]')
    this.saveButton = page.locator('[data-testid="save-button"]')
    this.deleteButton = page.locator('[data-testid="delete-button"]')
    this.editButton = page.locator('[data-testid="edit-button"]')
    this.successMessage = page.locator('[data-testid="success-message"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/categories')
  }

  async getCategoriesCount(): Promise<number> {
    return this.categoriesList.count()
  }

  async addCategory(name: string, description?: string): Promise<void> {
    await this.addCategoryButton.click()
    await this.categoryNameInput.fill(name)
    if (description) {
      await this.categoryDescriptionInput.fill(description)
    }
    await this.saveButton.click()
    await this.successMessage.waitFor({ state: 'visible' })
  }

  async editCategory(oldName: string, newName: string): Promise<void> {
    const category = this.categoriesList.filter({ hasText: oldName })
    await category.locator('[data-testid="edit-button"]').click()
    await this.categoryNameInput.clear()
    await this.categoryNameInput.fill(newName)
    await this.saveButton.click()
    await this.successMessage.waitFor({ state: 'visible' })
  }

  async deleteCategory(name: string): Promise<void> {
    const category = this.categoriesList.filter({ hasText: name })
    await category.locator('[data-testid="delete-button"]').click()
    await this.page.locator('[data-testid="confirm-delete-button"]').click()
    await this.successMessage.waitFor({ state: 'visible' })
  }

  async getError(): Promise<string> {
    return this.errorMessage.textContent() ?? ''
  }
}
