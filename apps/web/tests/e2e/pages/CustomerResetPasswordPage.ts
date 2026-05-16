import { Page, Locator } from '@playwright/test'

/**
 * Page Object para a página de redefinição de senha do cliente.
 * Rota: /reset-password?token=xxx
 */
export class CustomerResetPasswordPage {
  readonly page: Page
  readonly novaSenhaInput: Locator
  readonly confirmarSenhaInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator
  readonly successMessage: Locator
  readonly backButton: Locator

  constructor(page: Page) {
    this.page = page
    this.novaSenhaInput = page.locator('[data-testid="nova-senha-input"]')
    this.confirmarSenhaInput = page.locator('[data-testid="confirmar-senha-input"]')
    this.submitButton = page.locator('[data-testid="submit-button"]')
    this.errorMessage = page.locator('[data-testid="error-message"]')
    this.successMessage = page.locator('[data-testid="reset-success"]')
    this.backButton = page.locator('[aria-label="Voltar para login"]')
  }

  /**
   * Navega para a página de redefinição de senha com o token fornecido.
   */
  async goto(token: string): Promise<void> {
    await this.page.goto(`/reset-password?token=${token}&type=recovery`)
  }

  /**
   * Navega para a página de redefinição de senha sem token.
   */
  async gotoWithoutToken(): Promise<void> {
    await this.page.goto('/reset-password')
  }

  /**
   * Preenche o formulário de redefinição de senha.
   */
  async fillForm(novaSenha: string, confirmarSenha: string): Promise<void> {
    await this.novaSenhaInput.fill(novaSenha)
    await this.confirmarSenhaInput.fill(confirmarSenha)
  }

  /**
   * Submete o formulário de redefinição de senha.
   */
  async submit(): Promise<void> {
    await this.submitButton.click()
  }

  /**
   * Obtém a mensagem de erro exibida na página.
   */
  async getError(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent()
    }
    return null
  }

  /**
   * Verifica se a mensagem de sucesso está visível.
   */
  async isSuccessVisible(): Promise<boolean> {
    return this.successMessage.isVisible()
  }

  /**
   * Clica no botão de voltar para login.
   */
  async clickBackToLogin(): Promise<void> {
    await this.backButton.click()
  }
}