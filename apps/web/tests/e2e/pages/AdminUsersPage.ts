import { Page, Locator } from '@playwright/test'

export class AdminUsersPage {
  readonly page: Page
  readonly loading: Locator
  readonly userList: Locator
  readonly userCard: Locator
  readonly addButton: Locator
  readonly editButton: Locator
  readonly deleteButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator

  // Form elements
  readonly modal: Locator
  readonly emailInput: Locator
  readonly roleSelect: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator

  constructor(page: Page) {
    this.page = page
    this.loading = page.locator('[data-testid="loading"]')
    this.userList = page.locator('[data-testid="user-list"]')
    this.userCard = page.locator('[data-testid="user-card"]')
    this.addButton = page.locator('[data-testid="add-user-button"]')
    this.editButton = page.locator('[data-testid="edit-user-button"]')
    this.deleteButton = page.locator('[data-testid="delete-user-button"]')
    this.successMessage = page.locator('[data-testid="success-message"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')

    this.modal = page.locator('[data-testid="user-modal"]')
    this.emailInput = page.locator('[data-testid="email-input"]')
    this.roleSelect = page.locator('[data-testid="role-select"]')
    this.saveButton = page.locator('[data-testid="save-user-button"]')
    this.cancelButton = page.locator('[data-testid="cancel-button"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/users')
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  async openAddModal(): Promise<void> {
    await this.addButton.click()
    await this.modal.waitFor({ state: 'visible' })
  }

  async openEditModal(userIndex: number = 0): Promise<void> {
    await this.editButton.nth(userIndex).click()
    await this.modal.waitFor({ state: 'visible' })
  }

  async fillUserForm(data: { email?: string; role?: string }): Promise<void> {
    if (data.email !== undefined) {
      await this.emailInput.fill(data.email)
    }
    if (data.role !== undefined) {
      await this.roleSelect.selectOption(data.role)
    }
  }

  async saveUser(): Promise<void> {
    await this.saveButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  async cancelForm(): Promise<void> {
    await this.cancelButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  async deleteUser(userIndex: number = 0): Promise<void> {
    await this.deleteButton.nth(userIndex).click()
    // Wait for confirmation
    await this.page.waitForSelector('[data-testid="confirm-delete-modal"]', { state: 'visible' })
    await this.page.locator('[data-testid="confirm-delete-button"]').click()
  }

  async getUserCount(): Promise<number> {
    return this.userCard.count()
  }
}
