import { Page, Locator, expect } from '@playwright/test'

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export class OrderPage {
  readonly page: Page
  readonly orderId: Locator
  readonly orderStatus: Locator
  readonly orderItems: Locator
  readonly orderTotal: Locator
  readonly paymentStatus: Locator
  readonly qrCode: Locator
  readonly statusTimeline: Locator
  readonly cancelButton: Locator

  constructor(page: Page) {
    this.page = page
    this.orderId = page.locator('[data-testid="order-id"]')
    this.orderStatus = page.locator('[data-testid="order-status"]')
    this.orderItems = page.locator('[data-testid="order-item"]')
    this.orderTotal = page.locator('[data-testid="order-total"]')
    this.paymentStatus = page.locator('[data-testid="payment-status"]')
    this.qrCode = page.locator('[data-testid="order-qr-code"]')
    this.statusTimeline = page.locator('[data-testid="status-timeline"]')
    this.cancelButton = page.locator('[data-testid="cancel-order-button"]')
  }

  async goto(orderId: string): Promise<void> {
    await this.page.goto(`/order/${orderId}`)
  }

  async getOrderIdValue(): Promise<string> {
    return this.orderId.textContent() ?? ''
  }

  async getStatus(): Promise<OrderStatus> {
    const statusText = await this.orderStatus.textContent()
    return (statusText?.toLowerCase().trim() as OrderStatus) ?? 'pending'
  }

  async waitForStatus(status: OrderStatus, timeout = 60_000): Promise<void> {
    await expect(this.orderStatus).toHaveText(new RegExp(status, 'i'), { timeout })
  }

  async getItems(): Promise<string[]> {
    const count = await this.orderItems.count()
    const items: string[] = []
    for (let i = 0; i < count; i++) {
      items.push(await this.orderItems.nth(i).textContent() ?? '')
    }
    return items
  }

  async getTotal(): Promise<string> {
    return this.orderTotal.textContent() ?? ''
  }

  async isPaymentConfirmed(): Promise<boolean> {
    const status = await this.paymentStatus.textContent()
    return status?.toLowerCase().includes('confirm') ?? false
  }

  async cancelOrder(): Promise<void> {
    await this.cancelButton.click()
    await this.page.locator('[data-testid="confirm-cancel-button"]').click()
  }

  async getQRCode(): Promise<string> {
    const qrCodeSrc = await this.qrCode.getAttribute('src')
    return qrCodeSrc ?? ''
  }
}
