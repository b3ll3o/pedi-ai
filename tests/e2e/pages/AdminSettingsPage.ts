import { Page, Locator } from '@playwright/test'

export class AdminSettingsPage {
  readonly page: Page
  readonly loading: Locator
  readonly restaurantNameInput: Locator
  readonly descriptionInput: Locator
  readonly openTimeInput: Locator
  readonly closeTimeInput: Locator
  readonly phoneInput: Locator
  readonly addressInput: Locator
  readonly saveButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.loading = page.locator('[data-testid="loading"]')
    this.restaurantNameInput = page.locator('[data-testid="restaurant-name-input"]')
    this.descriptionInput = page.locator('[data-testid="description-input"]')
    this.openTimeInput = page.locator('[data-testid="open-time-input"]')
    this.closeTimeInput = page.locator('[data-testid="close-time-input"]')
    this.phoneInput = page.locator('[data-testid="phone-input"]')
    this.addressInput = page.locator('[data-testid="address-input"]')
    this.saveButton = page.locator('[data-testid="save-button"]')
    this.successMessage = page.locator('[data-testid="success-message"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/configuracoes')
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  async fillSettings(data: {
    restaurantName?: string
    description?: string
    openTime?: string
    closeTime?: string
    phone?: string
    address?: string
  }): Promise<void> {
    if (data.restaurantName !== undefined) {
      await this.restaurantNameInput.fill(data.restaurantName)
    }
    if (data.description !== undefined) {
      await this.descriptionInput.fill(data.description)
    }
    if (data.openTime !== undefined) {
      await this.openTimeInput.fill(data.openTime)
    }
    if (data.closeTime !== undefined) {
      await this.closeTimeInput.fill(data.closeTime)
    }
    if (data.phone !== undefined) {
      await this.phoneInput.fill(data.phone)
    }
    if (data.address !== undefined) {
      await this.addressInput.fill(data.address)
    }
  }

  async save(): Promise<void> {
    await this.saveButton.click()
  }

  async getSettings(): Promise<{
    restaurantName: string
    description: string
    openTime: string
    closeTime: string
    phone: string
    address: string
  }> {
    return {
      restaurantName: await this.restaurantNameInput.inputValue(),
      description: await this.descriptionInput.inputValue(),
      openTime: await this.openTimeInput.inputValue(),
      closeTime: await this.closeTimeInput.inputValue(),
      phone: await this.phoneInput.inputValue(),
      address: await this.addressInput.inputValue(),
    }
  }
}
