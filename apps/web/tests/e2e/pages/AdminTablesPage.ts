import { Page, Locator } from '@playwright/test'

export class AdminTablesPage {
  readonly page: Page
  readonly loading: Locator
  readonly tableList: Locator
  readonly addButton: Locator
  readonly tableCard: Locator
  readonly qrButton: Locator
  readonly editButton: Locator
  readonly deleteButton: Locator
  readonly successMessage: Locator
  readonly errorMessage: Locator

  // Modal elements
  readonly modal: Locator
  readonly modalTitle: Locator
  readonly numberInput: Locator
  readonly nameInput: Locator
  readonly capacityInput: Locator
  readonly generateQrCheckbox: Locator
  readonly saveButton: Locator
  readonly cancelButton: Locator

  // QR Modal elements
  readonly qrModal: Locator
  readonly qrImage: Locator
  readonly downloadQrButton: Locator
  readonly closeQrModalButton: Locator

  constructor(page: Page) {
    this.page = page
    this.loading = page.locator('[data-testid="loading"]')
    this.tableList = page.locator('[data-testid="table-list"]')
    this.addButton = page.locator('[data-testid="add-table-button"]')
    this.tableCard = page.locator('[data-testid="table-card"]')
    this.qrButton = page.locator('[data-testid="qr-button"]')
    this.editButton = page.locator('[data-testid="edit-table-button"]')
    this.deleteButton = page.locator('[data-testid="delete-table-button"]')
    this.successMessage = page.locator('[data-testid="success-message"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')

    // Modal
    this.modal = page.locator('[data-testid="table-modal"]')
    this.modalTitle = page.locator('[data-testid="modal-title"]')
    this.numberInput = page.locator('[data-testid="table-number-input"]')
    this.nameInput = page.locator('[data-testid="table-name-input"]')
    this.capacityInput = page.locator('[data-testid="table-capacity-input"]')
    this.generateQrCheckbox = page.locator('[data-testid="generate-qr-checkbox"]')
    this.saveButton = page.locator('[data-testid="save-table-button"]')
    this.cancelButton = page.locator('[data-testid="cancel-button"]')

    // QR Modal
    this.qrModal = page.locator('[data-testid="qr-modal"]')
    this.qrImage = page.locator('[data-testid="qr-image"]')
    this.downloadQrButton = page.locator('[data-testid="download-qr-button"]')
    this.closeQrModalButton = page.locator('[data-testid="close-qr-modal"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/tables')
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
  }

  async openAddModal(): Promise<void> {
    await this.addButton.click()
    await this.modal.waitFor({ state: 'visible' })
  }

  async openEditModal(tableIndex: number = 0): Promise<void> {
    await this.editButton.nth(tableIndex).click()
    await this.modal.waitFor({ state: 'visible' })
  }

  async fillTableForm(data: { number?: string; name?: string; capacity?: string; generateQr?: boolean }): Promise<void> {
    if (data.number !== undefined) {
      await this.numberInput.fill(data.number)
    }
    if (data.name !== undefined) {
      await this.nameInput.fill(data.name)
    }
    if (data.capacity !== undefined) {
      await this.capacityInput.fill(data.capacity)
    }
    if (data.generateQr !== undefined) {
      const isChecked = await this.generateQrCheckbox.isChecked()
      if (data.generateQr !== isChecked) {
        await this.generateQrCheckbox.click()
      }
    }
  }

  async saveTable(): Promise<void> {
    await this.saveButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  async cancelForm(): Promise<void> {
    await this.cancelButton.click()
    await this.modal.waitFor({ state: 'hidden' })
  }

  async openQrModal(tableIndex: number = 0): Promise<void> {
    await this.qrButton.nth(tableIndex).click()
    await this.qrModal.waitFor({ state: 'visible' })
  }

  async closeQrModal(): Promise<void> {
    await this.closeQrModalButton.click()
    await this.qrModal.waitFor({ state: 'hidden' })
  }

  async getTableCount(): Promise<number> {
    return this.tableCard.count()
  }

  async deleteTable(tableIndex: number = 0): Promise<void> {
    await this.deleteButton.nth(tableIndex).click()
    // Wait for confirmation dialog
    await this.page.waitForSelector('[data-testid="confirm-delete-modal"]', { state: 'visible' })
    await this.page.locator('[data-testid="confirm-delete-button"]').click()
  }
}
