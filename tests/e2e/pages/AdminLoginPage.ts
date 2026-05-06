import { Page, Locator } from '@playwright/test'

export class AdminLoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator
  readonly rememberMeCheckbox: Locator
  readonly forgotPasswordLink: Locator
  readonly forgotPasswordEmailInput: Locator
  readonly forgotPasswordSubmitButton: Locator
  readonly forgotPasswordSuccessMessage: Locator
  readonly newPasswordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly resetPasswordButton: Locator
  readonly resetSuccessMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('[data-testid="email-input"]')
    this.passwordInput = page.locator('[data-testid="password-input"]')
    this.loginButton = page.locator('[data-testid="login-button"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
    this.rememberMeCheckbox = page.locator('[data-testid="remember-me-checkbox"]')
    this.forgotPasswordLink = page.locator('[data-testid="forgot-password-link"]')
    this.forgotPasswordEmailInput = page.locator('[data-testid="forgot-password-email"]')
    this.forgotPasswordSubmitButton = page.locator('[data-testid="forgot-password-submit"]')
    this.forgotPasswordSuccessMessage = page.locator('[data-testid="forgot-password-success"]')
    this.newPasswordInput = page.locator('[data-testid="new-password-input"]')
    this.confirmPasswordInput = page.locator('[data-testid="confirm-password-input"]')
    this.resetPasswordButton = page.locator('[data-testid="reset-password-button"]')
    this.resetSuccessMessage = page.locator('[data-testid="reset-success-message"]')
  }

  async goto(): Promise<void> {
    // Check if page is still valid before navigating
    if (this.page.isClosed()) {
      throw new Error('Page is closed, cannot navigate')
    }
    await this.page.goto('/admin/login', { waitUntil: 'domcontentloaded', timeout: 30_000 })
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
    await this.page.waitForURL('/admin/dashboard', { timeout: 60_000 })
  }

  async gotoResetPassword(token: string): Promise<void> {
    await this.page.goto('/admin/reset-password?token=' + token)
  }

  async forgotPassword(email: string): Promise<void> {
    await this.forgotPasswordLink.click()
    await this.forgotPasswordEmailInput.fill(email)
    await this.forgotPasswordSubmitButton.click()
  }

  async submitNewPassword(newPassword: string): Promise<void> {
    await this.newPasswordInput.fill(newPassword)
    await this.confirmPasswordInput.fill(newPassword)
    await this.resetPasswordButton.click()
  }
}
