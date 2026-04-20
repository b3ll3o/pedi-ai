import { Page, Locator, expect } from '@playwright/test'

export class AdminLoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator
  readonly rememberMeCheckbox: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('[data-testid="email-input"]')
    this.passwordInput = page.locator('[data-testid="password-input"]')
    this.loginButton = page.locator('[data-testid="login-button"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
    this.rememberMeCheckbox = page.locator('[data-testid="remember-me-checkbox"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/login')
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  async getError(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? ''
  }

  async waitForDashboard(): Promise<void> {
    await this.page.waitForURL('/admin/dashboard', { timeout: 30_000 })
  }
}
