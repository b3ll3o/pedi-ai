import { Page, Locator } from '@playwright/test'

/**
 * Page Object para a página de registro do cliente.
 * Rota: /register
 */
export class RegisterPage {
  readonly page: Page
  readonly nameInput: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly registerButton: Locator
  readonly errorMessage: Locator
  readonly loginLink: Locator
  readonly forgotPasswordSuccessMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.nameInput = page.locator('[data-testid="name-input"]')
    this.emailInput = page.locator('[data-testid="email-input"]')
    this.passwordInput = page.locator('[data-testid="password-input"]')
    this.confirmPasswordInput = page.locator('[data-testid="confirm-password-input"]')
    this.registerButton = page.locator('[data-testid="register-button"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
    this.loginLink = page.locator('[data-testid="login-link"]')
    this.forgotPasswordSuccessMessage = page.locator('[data-testid="forgot-password-success"]')
  }

  /**
   * Navega para a página de registro.
   */
  async goto(): Promise<void> {
    await this.page.goto('/register')
  }

  /**
   * Realiza registro com as credenciais fornecidas.
   */
  async register(name: string, email: string, password: string, confirmPassword: string): Promise<void> {
    await this.nameInput.fill(name)
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.confirmPasswordInput.fill(confirmPassword)
    await this.registerButton.click()
  }

  /**
   * Obtém a mensagem de erro exibida na página.
   */
  async getError(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? ''
  }
}
