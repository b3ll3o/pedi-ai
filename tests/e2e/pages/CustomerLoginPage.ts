import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object para a página de login do cliente (usuário final).
 * Rota: /login
 * Redireciona para /menu após login bem-sucedido.
 */
export class CustomerLoginPage {
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

  /**
   * Navega para a página de login do cliente.
   */
  async goto(): Promise<void> {
    await this.page.goto('/login')
  }

  /**
   * Realiza login com as credenciais fornecidas.
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  /**
   * Obtém a mensagem de erro exibida na página.
   */
  async getError(): Promise<string> {
    return (await this.errorMessage.textContent()) ?? ''
  }

  /**
   * Aguarda até que o usuário seja redirecionado para o cardápio digital.
   */
  async waitForMenu(): Promise<void> {
    await this.page.waitForURL('/menu', { timeout: 30_000 })
  }

  /**
   * Navega para a página de redefinição de senha com o token fornecido.
   */
  async gotoResetPassword(token: string): Promise<void> {
    await this.page.goto('/reset-password?token=' + token)
  }

  /**
   * Solicita recuperação de senha para o email fornecido.
   */
  async forgotPassword(email: string): Promise<void> {
    await this.forgotPasswordLink.click()
    await this.forgotPasswordEmailInput.fill(email)
    await this.forgotPasswordSubmitButton.click()
  }

  /**
   * Define a nova senha após recuperação.
   */
  async submitNewPassword(newPassword: string): Promise<void> {
    await this.newPasswordInput.fill(newPassword)
    await this.confirmPasswordInput.fill(newPassword)
    await this.resetPasswordButton.click()
  }
}