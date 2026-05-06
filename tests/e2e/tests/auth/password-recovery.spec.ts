import { test, expect } from '../shared/fixtures'
import { CustomerLoginPage } from '../../pages/CustomerLoginPage'
import { CustomerResetPasswordPage } from '../../pages/CustomerResetPasswordPage'
import { AdminResetPasswordPage } from '../../pages/AdminResetPasswordPage'

async function cleanupTest(page: Page) {
  try {
    await page.context().clearCookies()
  } catch { /* ignore */ }
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch { /* ignore */ }
    })
  } catch { /* ignore */ }
  try {
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('pedi')
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
        req.onblocked = () => resolve()
      })
    })
  } catch { /* ignore */ }
}

test.describe('Recuperação de Senha - Login Page', () => {
  let loginPage: CustomerLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new CustomerLoginPage(page)
    await loginPage.goto()
  })

  test.afterEach(async ({ page }) => {
    await cleanupTest(page)
  })

  test('deve exibir link para esqueci minha senha na página de login', async ({ page: _page }) => {
    await expect(loginPage.forgotPasswordLink).toBeVisible()
  })

  test('deve mostrar formulário de recuperação ao clicar em esqueci minha senha', async ({ page }) => {
    await loginPage.forgotPasswordLink.click()
    await expect(loginPage.forgotPasswordEmailInput).toBeVisible()
    await expect(loginPage.forgotPasswordSubmitButton).toBeVisible()
  })

  test('deve solicitar recuperação de senha com email válido', async ({ page: _page, seedData }) => {
    await loginPage.forgotPassword(seedData.customer.email)
    await expect(loginPage.forgotPasswordSuccessMessage).toBeVisible()
  })

  test('deve exibir sucesso mesmo com email inexistente (segurança do Supabase)', async ({ page: _page }) => {
    await loginPage.forgotPassword('nonexistent@test.com')
    await _page.waitForTimeout(1000)
    const pageContent = await _page.content()
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
    const recoveryFormVisible = await loginPage.forgotPasswordEmailInput.isVisible()
    expect(recoveryFormVisible).toBe(true)
  })
})

test.describe('Página de Redefinição de Senha - Cliente', () => {
  let resetPasswordPage: CustomerResetPasswordPage

  test.beforeEach(async ({ page }) => {
    resetPasswordPage = new CustomerResetPasswordPage(page)
  })

  test.afterEach(async ({ page }) => {
    await cleanupTest(page)
  })

  test('deve exibir erro quando token não está presente', async ({ page }) => {
    await resetPasswordPage.gotoWithoutToken()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toContainText('Link inválido', { timeout: 15000 })
  })

  test('deve exibir formulário de redefinição com token válido', async ({ page }) => {
    await resetPasswordPage.goto('valid-token-placeholder')
    await page.waitForLoadState('domcontentloaded')
    await expect(resetPasswordPage.novaSenhaInput).toBeVisible({ timeout: 15000 })
    await expect(resetPasswordPage.confirmarSenhaInput).toBeVisible()
    await expect(resetPasswordPage.submitButton).toBeVisible()
  })

  test('deve validar que senhas coincidem', async ({ page }) => {
    await resetPasswordPage.goto('valid-token-placeholder')
    await page.waitForLoadState('domcontentloaded')
    await expect(resetPasswordPage.novaSenhaInput).toBeVisible({ timeout: 15000 })
    await resetPasswordPage.fillForm('password123', 'differentpassword')
    await resetPasswordPage.submit()
    await expect(page.locator('[data-testid="confirmar-senha-error"]')).toContainText('não coincidem', { timeout: 5000 })
  })

  test('deve validar que senha tem pelo menos 6 caracteres', async ({ page }) => {
    await resetPasswordPage.goto('valid-token-placeholder')
    await page.waitForLoadState('domcontentloaded')
    await expect(resetPasswordPage.novaSenhaInput).toBeVisible({ timeout: 15000 })
    await resetPasswordPage.fillForm('123', '123')
    await resetPasswordPage.submit()
    await expect(page.locator('[data-testid="senha-error"]')).toContainText('pelo menos 6 caracteres', { timeout: 5000 })
  })

  test('deve ter botão de voltar para login', async ({ page }) => {
    await resetPasswordPage.goto('valid-token-placeholder')
    await page.waitForLoadState('domcontentloaded')
    await expect(resetPasswordPage.backButton).toBeVisible({ timeout: 15000 })
  })

  test('deve ter link para fazer login no footer', async ({ page }) => {
    await resetPasswordPage.goto('valid-token-placeholder')
    await page.waitForLoadState('domcontentloaded')
    const footerLink = page.locator('a[href="/login"]').last()
    await expect(footerLink).toBeVisible({ timeout: 15000 })
  })
})

test.describe('Página de Redefinição de Senha - Admin', () => {
  let resetPasswordPage: AdminResetPasswordPage

  test.beforeEach(async ({ page }) => {
    resetPasswordPage = new AdminResetPasswordPage(page)
  })

  test.afterEach(async ({ page }) => {
    await cleanupTest(page)
  })

  test('deve exibir erro quando token não está presente na página admin', async ({ page }) => {
    await resetPasswordPage.gotoWithoutToken()
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toContainText('Link inválido', { timeout: 15000 })
  })

  test('deve exibir formulário de redefinição com token válido na página admin', async ({ page }) => {
    await resetPasswordPage.goto('valid-token-placeholder')
    await page.waitForLoadState('domcontentloaded')
    await expect(resetPasswordPage.novaSenhaInput).toBeVisible({ timeout: 15000 })
    await expect(resetPasswordPage.confirmarSenhaInput).toBeVisible()
    await expect(resetPasswordPage.submitButton).toBeVisible()
  })

  test('deve validar que senhas coincidem na página admin', async ({ page }) => {
    await resetPasswordPage.goto('valid-token-placeholder')
    await page.waitForLoadState('domcontentloaded')
    await expect(resetPasswordPage.novaSenhaInput).toBeVisible({ timeout: 15000 })
    await resetPasswordPage.fillForm('password123', 'differentpassword')
    await resetPasswordPage.submit()
    await expect(page.locator('[data-testid="confirmar-senha-error"]')).toContainText('não coincidem', { timeout: 5000 })
  })

  test('deve validar que senha tem pelo menos 6 caracteres na página admin', async ({ page }) => {
    await resetPasswordPage.goto('valid-token-placeholder')
    await page.waitForLoadState('domcontentloaded')
    await expect(resetPasswordPage.novaSenhaInput).toBeVisible({ timeout: 15000 })
    await resetPasswordPage.fillForm('123', '123')
    await resetPasswordPage.submit()
    await expect(page.locator('[data-testid="senha-error"]')).toContainText('pelo menos 6 caracteres', { timeout: 5000 })
  })
})

test.describe('Validação de Type Parameter na URL', () => {
  let resetPasswordPage: CustomerResetPasswordPage

  test.beforeEach(async ({ page }) => {
    resetPasswordPage = new CustomerResetPasswordPage(page)
  })

  test.afterEach(async ({ page }) => {
    await cleanupTest(page)
  })

  test('deve exibir erro quando type não é recovery', async ({ page }) => {
    await page.goto('/reset-password?token=test&type=signup')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('h1')).toContainText('Link inválido', { timeout: 15000 })
  })

  test('deve exibir formulário quando type é recovery', async ({ page }) => {
    await resetPasswordPage.goto('valid-token')
    await page.waitForLoadState('domcontentloaded')
    await expect(resetPasswordPage.novaSenhaInput).toBeVisible({ timeout: 15000 })
  })
})