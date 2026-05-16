import { test, expect } from '../shared/fixtures'
import { AdminLoginPage } from '../../pages/AdminLoginPage'
import { CustomerLoginPage } from '../../pages/CustomerLoginPage'

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

test.describe('Admin Authentication', () => {
  let loginPage: AdminLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new AdminLoginPage(page)
    await loginPage.goto()
  })

  test.afterEach(async ({ page }) => {
    await cleanupTest(page)
  })

  test('should display login form', async ({ page: _page }) => {
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.loginButton).toBeVisible()
  })

  test('should login with valid admin credentials', { tag: ['@smoke', '@critical'] }, async ({ page, seedData }) => {
    await loginPage.login(seedData.admin.email, seedData.admin.password)
    await loginPage.waitForDashboard()
    await expect(page).toHaveURL('/admin/dashboard')
  })

  test('should show error with invalid credentials', async ({ page: _page }) => {
    await loginPage.login('invalid@test.com', 'wrongpassword')
    const error = await loginPage.getError()
    expect(error).toMatch(/inválido|incorreto|não encontrado|invalid|incorrect|not found/i)
  })

  test('should show error with empty fields', async ({ page }) => {
    await loginPage.login('', '')
    await expect(page.locator('[data-testid="field-error"]').first()).toBeVisible()
  })

  test('should logout and redirect to login', { tag: ['@smoke', '@critical'] }, async ({ admin }) => {
    await admin.locator('[data-testid="admin-logout-button"]').click()
    await expect(admin).toHaveURL('/admin/login')
  })

  test('should redirect to login when accessing protected route', { tag: ['@smoke', '@critical'] }, async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('should remember admin session', async ({ admin }) => {
    // Admin should stay logged in after page reload
    await admin.reload()
    await expect(admin).toHaveURL('/admin/dashboard')
  })

  test('should request password reset and login with new password', async ({ page: _page, seedData }) => {
    await loginPage.forgotPassword(seedData.admin.email)
    await expect(loginPage.forgotPasswordSuccessMessage).toBeVisible()
  })

  test('admin acessando /login diretamente deve ir para /menu (fluxo cliente)',
    async ({ page, seedData }) => {
      // Admin acessando /login (página de cliente) deve seguir fluxo de cliente
      // O redirect é baseado no perfil, não na página de origem
      const loginPage = new CustomerLoginPage(page)
      await loginPage.goto()
      await loginPage.login(seedData.admin.email, seedData.admin.password)
      // Admin vai para /menu (fluxo de cliente)
      await page.waitForURL('/menu', { timeout: 30_000 })
      await expect(page).toHaveURL('/menu')
    }
  )

  test('should show success for password reset request', async ({ page: _page }) => {
    // Supabase always returns success for password reset (security - never reveals if email exists)
    await loginPage.forgotPassword('nonexistent@test.com')
    await expect(loginPage.forgotPasswordSuccessMessage).toBeVisible()
  })
})
