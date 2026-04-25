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
    // OrderList.tsx não tem data-testids nos selects de filtro - usar aria-label
    this.filterStatusSelect = page.locator('select[aria-label="Filtrar por status"]')
    this.filterDateInput = page.locator('[data-testid="filter-date-input"]')
    // OrderList.tsx usa input[type="search"] sem data-testid - buscar pelo placeholder
    this.searchInput = page.locator('input[placeholder*="Buscar"]')
    this.updateStatusButton = page.locator('[data-testid="update-status-button"]')
    this.viewDetailsButton = page.locator('[data-testid="view-details-button"]')
    // Cancelamento é feito via select de status (não há botão cancel-order-button)
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

  async getError(): Promise<string> {
    const errorLocator = this.page.locator('[data-testid="error-message"]')
    return errorLocator.textContent() ?? ''
  }

  async filterByStatus(status: AdminOrderStatus): Promise<number> {
    await this.filterStatusSelect.selectOption(status)
    await this.page.waitForResponse(/\/api\/admin\/orders/)
    return this.ordersList.count()
  }

  async searchByCustomerEmail(email: string): Promise<number> {
    await this.searchInput.fill(email)
    await this.page.waitForResponse(/\/api\/admin\/orders/)
    return this.ordersList.count()
  }

  async viewOrderDetails(orderId: string): Promise<void> {
    const order = this.ordersList.filter({ hasText: orderId })
    await order.locator('[data-testid="view-details-button"]').click()
    await this.orderModal.waitFor({ state: 'visible' })
  }

  async updateOrderStatus(orderId: string, newStatus: AdminOrderStatus): Promise<void> {
    const order = this.ordersList.filter({ hasText: orderId })
    // O select de status já está dentro do update-status-button span
    await order.locator('[data-testid="order-status-select"]').selectOption(newStatus)
    // Não há botão de confirmação - o select já dispara a atualização
  }

  async cancelOrder(orderId: string): Promise<void> {
    const order = this.ordersList.filter({ hasText: orderId })
    // Cancelamento é feito via select de status com valor "cancelled"
    await order.locator('[data-testid="order-status-select"]').selectOption('cancelled')
  }

  async getOrderStatus(orderId: string): Promise<AdminOrderStatus> {
    const order = this.ordersList.filter({ hasText: orderId })
    const statusText = await order.locator('[data-testid="order-status"]').textContent()
    return (statusText?.toLowerCase().trim() as AdminOrderStatus) ?? 'pending'
  }
}
