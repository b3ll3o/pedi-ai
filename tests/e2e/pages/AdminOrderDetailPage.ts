import { Page, Locator } from '@playwright/test'

export class AdminOrderDetailPage {
  readonly page: Page
  readonly loading: Locator
  readonly orderId: Locator
  readonly orderStatus: Locator
  readonly customerName: Locator
  readonly customerPhone: Locator
  readonly tableNumber: Locator
  readonly orderItems: Locator
  readonly orderTotal: Locator
  readonly updateStatusButton: Locator
  readonly cancelButton: Locator
  readonly backLink: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator

  // Cancel modal
  readonly cancelModal: Locator
  readonly cancelReasonInput: Locator
  readonly confirmCancelButton: Locator

  constructor(page: Page) {
    this.page = page
    this.loading = page.locator('[data-testid="loading"]')
    this.orderId = page.locator('[data-testid="order-id"]')
    this.orderStatus = page.locator('[data-testid="order-status"]')
    this.customerName = page.locator('[data-testid="customer-name"]')
    this.customerPhone = page.locator('[data-testid="customer-phone"]')
    this.tableNumber = page.locator('[data-testid="table-number"]')
    this.orderItems = page.locator('[data-testid="order-items"]')
    this.orderTotal = page.locator('[data-testid="order-total"]')
    this.updateStatusButton = page.locator('[data-testid="update-status-button"]')
    this.cancelButton = page.locator('[data-testid="cancel-order-button"]')
    this.backLink = page.locator('[data-testid="back-link"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
    this.successMessage = page.locator('[data-testid="success-message"]')

    this.cancelModal = page.locator('[data-testid="cancel-modal"]')
    this.cancelReasonInput = page.locator('[data-testid="cancel-reason-input"]')
    this.confirmCancelButton = page.locator('[data-testid="confirm-cancel-button"]')
  }

  async goto(orderId: string): Promise<void> {
    await this.page.goto(`/admin/orders/${orderId}`)
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await this.orderId.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      // Error state may not have orderId
    })
  }

  async getStatus(): Promise<string> {
    return this.orderStatus.textContent() ?? ''
  }

  async getOrderId(): Promise<string> {
    return this.orderId.textContent() ?? ''
  }

  async updateStatus(): Promise<void> {
    await this.updateStatusButton.click()
  }

  async openCancelModal(): Promise<void> {
    await this.cancelButton.click()
    await this.cancelModal.waitFor({ state: 'visible' })
  }

  async fillCancelReason(reason: string): Promise<void> {
    await this.cancelReasonInput.fill(reason)
  }

  async confirmCancel(): Promise<void> {
    await this.confirmCancelButton.click()
    await this.cancelModal.waitFor({ state: 'hidden' })
  }

  async cancelOrder(reason?: string): Promise<void> {
    await this.openCancelModal()
    if (reason) {
      await this.fillCancelReason(reason)
    }
    await this.confirmCancel()
  }

  async goBack(): Promise<void> {
    await this.backLink.click()
  }

  async getItemCount(): Promise<number> {
    return this.page.locator('[data-testid="order-item"]').count()
  }

  async getTotal(): Promise<string> {
    return this.orderTotal.textContent() ?? ''
  }
}
