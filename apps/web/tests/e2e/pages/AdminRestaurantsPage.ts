import { Page, Locator } from '@playwright/test'

export class AdminRestaurantsPage {
  readonly page: Page
  readonly loading: Locator
  readonly restaurantList: Locator
  readonly restaurantCard: Locator
  readonly addButton: Locator
  readonly editButton: Locator
  readonly deleteButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator

  // Form elements
  readonly modal: Locator
  readonly nameInput: Locator
  readonly descriptionInput: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator

  constructor(page: Page) {
    this.page = page
    this.loading = page.locator('[data-testid="loading"]')
    this.restaurantList = page.locator('[data-testid="restaurant-list"]')
    this.restaurantCard = page.locator('[data-testid="restaurant-card"]')
    this.addButton = page.locator('[data-testid="add-restaurant-button"]')
    this.editButton = page.locator('[data-testid="edit-restaurant-button"]')
    this.deleteButton = page.locator('[data-testid="delete-restaurant-button"]')
    this.successMessage = page.locator('[data-testid="success-message"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')

    this.modal = page.locator('[data-testid="restaurant-modal"]')
    this.nameInput = page.locator('[data-testid="restaurant-name-input"]')
    this.descriptionInput = page.locator('[data-testid="restaurant-description-input"]')
    this.saveButton = page.locator('[data-testid="save-restaurant-button"]')
    this.cancelButton = page.locator('[data-testid="cancel-button"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/restaurants')
  }

  async gotoNew(): Promise<void> {
    await this.page.goto('/admin/restaurants/new')
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  async openAddModal(): Promise<void> {
    await this.addButton.click()
    await this.modal.waitFor({ state: 'visible' })
  }

  async openEditModal(restaurantIndex: number = 0): Promise<void> {
    await this.editButton.nth(restaurantIndex).click()
    await this.modal.waitFor({ state: 'visible' })
  }

  async fillRestaurantForm(data: { name?: string; description?: string }): Promise<void> {
    if (data.name !== undefined) {
      await this.nameInput.fill(data.name)
    }
    if (data.description !== undefined) {
      await this.descriptionInput.fill(data.description)
    }
  }

  async saveRestaurant(): Promise<void> {
    await this.saveButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  async cancelForm(): Promise<void> {
    await this.cancelButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  async deleteRestaurant(restaurantIndex: number = 0): Promise<void> {
    await this.deleteButton.nth(restaurantIndex).click()
    await this.page.waitForSelector('[data-testid="confirm-delete-modal"]', { state: 'visible' })
    await this.page.locator('[data-testid="confirm-delete-button"]').click()
  }

  async getRestaurantCount(): Promise<number> {
    return this.restaurantCard.count()
  }

  async selectRestaurant(restaurantIndex: number = 0): Promise<void> {
    await this.restaurantCard.nth(restaurantIndex).click()
  }
}
