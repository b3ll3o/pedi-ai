import { Page, Locator } from '@playwright/test'

export class WaiterDashboardPage {
  readonly page: Page
  readonly loading: Locator
  readonly orderCard: Locator
  readonly orderStatus: Locator
  readonly connectionStatus: Locator
  readonly kitchenNavLink: Locator
  readonly logo: Locator
  readonly emptyState: Locator
  readonly newOrderNotification: Locator

  constructor(page: Page) {
    this.page = page
    this.loading = page.locator('[data-testid="loading"]')
    this.orderCard = page.locator('[data-testid="order-card"]')
    this.orderStatus = page.locator('[data-testid="order-status"]')
    this.connectionStatus = page.locator('[data-testid="connection-status"]')
    this.kitchenNavLink = page.locator('[data-testid="nav-kitchen"]')
    this.logo = page.locator('[data-testid="logo"]')
    this.emptyState = page.locator('[data-testid="empty-state"]')
    this.newOrderNotification = page.locator('[data-testid="new-order-notification"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/garcom/dashboard')
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle')
    await this.orderCard.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {
      // May be empty state
    })
  }

  async getOrderCount(): Promise<number> {
    return this.orderCard.count()
  }

  async getOrderStatus(orderIndex: number): Promise<string> {
    return this.orderStatus.nth(orderIndex).textContent() ?? ''
  }

  async clickOrder(orderIndex: number = 0): Promise<void> {
    await this.orderCard.nth(orderIndex).click()
  }

  async isConnected(): Promise<boolean> {
    const status = await this.connectionStatus.textContent()
    return status?.toLowerCase().includes('conectado') ?? false
  }

  async getLatency(): Promise<number> {
    const statusText = await this.connectionStatus.textContent() ?? ''
    const match = statusText.match(/\d+ms/)
    return match ? parseInt(match[0], 10) : -1
  }

  async navigateToKitchen(): Promise<void> {
    await this.kitchenNavLink.click()
  }

  async waitForNewOrder(timeout: number = 5000): Promise<void> {
    try {
      await this.newOrderNotification.waitFor({ state: 'visible', timeout })
    } catch {
      // No new order within timeout
    }
  }
}
