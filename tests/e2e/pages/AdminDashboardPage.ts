import { Page, Locator, expect } from '@playwright/test'

export class AdminDashboardPage {
  readonly page: Page
  readonly sidebar: Locator
  readonly ordersCount: Locator
  readonly revenueTotal: Locator
  readonly activeOrders: Locator
  readonly categoriesLink: Locator
  readonly productsLink: Locator
  readonly ordersLink: Locator
  readonly logoutButton: Locator

  constructor(page: Page) {
    this.page = page
    this.sidebar = page.locator('[data-testid="admin-sidebar"]')
    this.ordersCount = page.locator('[data-testid="orders-count"]')
    this.revenueTotal = page.locator('[data-testid="revenue-total"]')
    this.activeOrders = page.locator('[data-testid="active-orders"]')
    this.categoriesLink = page.locator('[data-testid="nav-categories"]')
    this.productsLink = page.locator('[data-testid="nav-products"]')
    this.ordersLink = page.locator('[data-testid="nav-orders"]')
    this.logoutButton = page.locator('[data-testid="logout-button"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/dashboard')
  }

  async navigateToCategories(): Promise<void> {
    await this.categoriesLink.click()
    await this.page.waitForURL('/admin/categories')
  }

  async navigateToProducts(): Promise<void> {
    await this.productsLink.click()
    await this.page.waitForURL('/admin/products')
  }

  async navigateToOrders(): Promise<void> {
    await this.ordersLink.click()
    await this.page.waitForURL('/admin/orders')
  }

  async logout(): Promise<void> {
    await this.logoutButton.click()
    await this.page.waitForURL('/admin/login')
  }

  async getOrdersCount(): Promise<string> {
    return (await this.ordersCount.textContent()) ?? ''
  }

  async getRevenueTotal(): Promise<string> {
    return (await this.revenueTotal.textContent()) ?? ''
  }

  async getActiveOrdersCount(): Promise<number> {
    return this.activeOrders.locator('[data-testid="order-card"]').count()
  }
}
