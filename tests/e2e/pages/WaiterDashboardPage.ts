import { Page, Locator } from '@playwright/test'

export type KitchenOrderStatus = 'pending' | 'preparing' | 'ready'

export class WaiterDashboardPage {
  readonly page: Page
  readonly sidebar: Locator
  readonly kitchenOrders: Locator
  readonly activeOrders: Locator
  readonly completedOrders: Locator
  readonly orderTicket: Locator
  readonly startPreparingButton: Locator
  readonly markReadyButton: Locator
  readonly markDeliveredButton: Locator
  readonly refreshButton: Locator
  readonly audioToggle: Locator

  constructor(page: Page) {
    this.page = page
    this.sidebar = page.locator('[data-testid="waiter-sidebar"]')
    this.kitchenOrders = page.locator('[data-testid^="kitchen-order-card-"]')
    this.activeOrders = page.locator('[data-testid="active-order"]')
    this.completedOrders = page.locator('[data-testid="completed-order"]')
    this.orderTicket = page.locator('[data-testid="order-ticket"]')
    this.startPreparingButton = page.locator('[data-testid^="kitchen-preparing-button-"]')
    this.markReadyButton = page.locator('[data-testid^="kitchen-ready-button-"]')
    this.markDeliveredButton = page.locator('[data-testid="mark-delivered-button"]')
    this.refreshButton = page.locator('[data-testid="refresh-button"]')
    this.audioToggle = page.locator('[data-testid="audio-toggle"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/dashboard')
    // Waiter dashboard is typically the same as admin dashboard
    // but with kitchen-focused view
  }

  async navigateToKitchen(): Promise<void> {
    await this.page.locator('[data-testid="nav-kitchen"]').click()
    await this.page.waitForURL(/\/kitchen/)
  }

  async getKitchenOrdersCount(): Promise<number> {
    return this.kitchenOrders.count()
  }

  async getActiveOrdersCount(): Promise<number> {
    return this.activeOrders.count()
  }

  async getCompletedOrdersCount(): Promise<number> {
    return this.completedOrders.count()
  }

  async startPreparing(orderId: string): Promise<void> {
    const order = this.kitchenOrders.filter({ hasText: orderId })
    await order.locator(`[data-testid="kitchen-preparing-button-${orderId}"]`).click()
  }

  async markReady(orderId: string): Promise<void> {
    const order = this.kitchenOrders.filter({ hasText: orderId })
    await order.locator(`[data-testid="kitchen-ready-button-${orderId}"]`).click()
  }

  async markDelivered(orderId: string): Promise<void> {
    const order = this.activeOrders.filter({ hasText: orderId })
    await order.locator('[data-testid="mark-delivered-button"]').click()
  }

  async refreshOrders(): Promise<void> {
    await this.refreshButton.click()
    await this.page.waitForResponse(/\/api\/orders/)
  }

  async getOrderItems(orderId: string): Promise<string[]> {
    const order = this.kitchenOrders.filter({ hasText: orderId })
    const items = order.locator('[data-testid="order-item"]')
    const count = await items.count()
    const itemList: string[] = []
    for (let i = 0; i < count; i++) {
      itemList.push(await items.nth(i).textContent() ?? '')
    }
    return itemList
  }

  async waitForNewOrder(timeout = 60_000): Promise<void> {
    const initialCount = await this.getKitchenOrdersCount()
    await this.page.waitForFunction(
      (count) => document.querySelectorAll('[data-testid^="kitchen-order-card-"]').length > count,
      initialCount,
      { timeout }
    )
  }
}
