import { Page, Locator } from '@playwright/test'

export type AdminOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export interface OrderFilter {
  status?: AdminOrderStatus
  date?: string
  customerEmail?: string
}

export class AdminOrdersPage {
  readonly page: Page
  readonly ordersList: Locator
  readonly orderCard: Locator
  readonly filterStatusSelect: Locator
  readonly filterDateInput: Locator
  readonly searchInput: Locator
  readonly updateStatusButton: Locator
  readonly viewDetailsButton: Locator
  readonly cancelOrderButton: Locator
  readonly orderModal: Locator
  readonly orderStatusSelect: Locator

  constructor(page: Page) {
    this.page = page
    this.ordersList = page.locator('[data-testid="admin-order-item"]')
    this.orderCard = page.locator('[data-testid="order-card"]')
    this.filterStatusSelect = page.locator('[data-testid="filter-status-select"]')
    this.filterDateInput = page.locator('[data-testid="filter-date-input"]')
    this.searchInput = page.locator('[data-testid="search-orders-input"]')
    this.updateStatusButton = page.locator('[data-testid="update-status-button"]')
    this.viewDetailsButton = page.locator('[data-testid="view-details-button"]')
    this.cancelOrderButton = page.locator('[data-testid="cancel-order-button"]')
    this.orderModal = page.locator('[data-testid="order-details-modal"]')
    this.orderStatusSelect = page.locator('[data-testid="order-status-select"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/orders')
  }

  async getOrdersCount(): Promise<number> {
    return this.ordersList.count()
  }

  async filterByStatus(status: AdminOrderStatus): Promise<void> {
    await this.filterStatusSelect.selectOption(status)
    await this.page.waitForResponse(/\/api\/admin\/orders/)
  }

  async searchByCustomerEmail(email: string): Promise<void> {
    await this.searchInput.fill(email)
    await this.page.waitForResponse(/\/api\/admin\/orders/)
  }

  async viewOrderDetails(orderId: string): Promise<void> {
    const order = this.ordersList.filter({ hasText: orderId })
    await order.locator('[data-testid="view-details-button"]').click()
    await this.orderModal.waitFor({ state: 'visible' })
  }

  async updateOrderStatus(orderId: string, newStatus: AdminOrderStatus): Promise<void> {
    const order = this.ordersList.filter({ hasText: orderId })
    await order.locator('[data-testid="update-status-button"]').click()
    await this.orderStatusSelect.selectOption(newStatus)
    await this.page.locator('[data-testid="confirm-status-update"]').click()
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = this.ordersList.filter({ hasText: orderId })
    await order.locator('[data-testid="cancel-order-button"]').click()
    await this.page.locator('[data-testid="confirm-cancel-button"]').click()
  }

  async getOrderStatus(orderId: string): Promise<AdminOrderStatus> {
    const order = this.ordersList.filter({ hasText: orderId })
    const statusText = await order.locator('[data-testid="order-status"]').textContent()
    return (statusText?.toLowerCase().trim() as AdminOrderStatus) ?? 'pending'
  }
}
