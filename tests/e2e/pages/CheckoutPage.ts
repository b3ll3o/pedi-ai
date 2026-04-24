import { Page, Locator, expect } from '@playwright/test'

export type PaymentMethod = 'pix' | 'credit' | 'debit'

export class CheckoutPage {
  readonly page: Page
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly phoneInput: Locator
  readonly tableCodeInput: Locator
  readonly pixButton: Locator
  readonly cardButton: Locator
  readonly submitButton: Locator
  readonly orderSummary: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.nameInput = page.locator('[data-testid="customer-name-input"]')
    this.emailInput = page.locator('[data-testid="checkout-email"]')
    this.phoneInput = page.locator('[data-testid="customer-phone-input"]')
    this.tableCodeInput = page.locator('[data-testid="checkout-table-number"]')
    this.pixButton = page.locator('[data-testid="payment-method-pix"]')
    this.cardButton = page.locator('[data-testid="payment-method-card"]')
    this.submitButton = page.locator('[data-testid="checkout-submit"]')
    this.orderSummary = page.locator('[data-testid="order-summary"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/checkout')
  }

  async fillCustomerInfo(info: {
    name?: string
    email?: string
    phone?: string
    tableCode?: string
  }): Promise<void> {
    if (info.name) await this.nameInput.fill(info.name)
    if (info.email) await this.emailInput.fill(info.email)
    if (info.phone) await this.phoneInput.fill(info.phone)
    if (info.tableCode) await this.tableCodeInput.fill(info.tableCode)
  }

  async selectPaymentMethod(method: PaymentMethod): Promise<void> {
    if (method === 'pix') {
      await this.pixButton.click()
    } else {
      await this.cardButton.click()
    }
  }

  async submitOrder(): Promise<void> {
    await this.submitButton.click()
  }

  async getOrderTotal(): Promise<string> {
    const summaryText = await this.orderSummary.textContent()
    const match = summaryText?.match(/total[:\s]*R\$\s*([\d,.]+)/i)
    return match ? match[1] : ''
  }

  async getError(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? ''
  }

  async waitForConfirmation(): Promise<void> {
    await this.page.waitForURL(/\/order\//, { timeout: 30_000 })
  }
}
