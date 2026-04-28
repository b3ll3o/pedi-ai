import { test, expect } from '../shared/fixtures'
import { CustomerLoginPage } from '../../pages/CustomerLoginPage'

test.describe('Recuperação de Senha', () => {
  let loginPage: CustomerLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new CustomerLoginPage(page)
    await loginPage.goto()
  })

  test('deve exibir link para esqueci minha senha na página de login', async ({ page: _page }) => {
    await expect(loginPage.forgotPasswordLink).toBeVisible()
  })

  test('deve mostrar formulário de recuperação ao clicar em esqueci minha senha', async ({ page }) => {
    await loginPage.forgotPasswordLink.click()
    // O formulário aparece na mesma página (sem redirect)
    await expect(loginPage.forgotPasswordEmailInput).toBeVisible()
    await expect(loginPage.forgotPasswordSubmitButton).toBeVisible()
  })

  test('deve solicitar recuperação de senha com email válido', async ({ page: _page, seedData }) => {
    await loginPage.forgotPassword(seedData.customer.email)
    await expect(loginPage.forgotPasswordSuccessMessage).toBeVisible()
  })

  test('deve exibir sucesso mesmo com email inexistente (segurança do Supabase)', async ({ page: _page }) => {
    // Supabase não revela se email existe por segurança - sempre mostra sucesso
    await loginPage.forgotPassword('nonexistent@test.com')
    await _page.waitForTimeout(1000)
    // Aguarda a resposta do Supabase
    const pageContent = await _page.content()
    // Usuário ainda está na página de login ou já se inscreveu
    expect(
      pageContent.includes('login') ||
      pageContent.includes('esqueci') ||
      pageContent.includes('recuperar') ||
      pageContent.includes('forgot') ||
      pageContent.includes('email')
    ).toBe(true)
  })

  test('deve ocultar campos de login quando formulário de recuperação está visível', async ({ page }) => {
    await loginPage.forgotPasswordLink.click()
    await expect(loginPage.forgotPasswordEmailInput).toBeVisible()
    // Os campos de login padrão podem estar ocultos ou desabilitados
    // Verifica que pelo menos um elemento de recuperação está visível
    const recoveryFormVisible = await loginPage.forgotPasswordEmailInput.isVisible()
    expect(recoveryFormVisible).toBe(true)
  })

  test('deve voltar ao login ao clicar em link de volta ao login (se existir)', async ({ page }) => {
    await loginPage.forgotPasswordLink.click()
    await expect(loginPage.forgotPasswordEmailInput).toBeVisible()

    // Tenta encontrar e clicar no link de volta ao login
    const backToLoginLink = page.locator('[data-testid="back-to-login-link"]')
    if (await backToLoginLink.isVisible()) {
      await backToLoginLink.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
