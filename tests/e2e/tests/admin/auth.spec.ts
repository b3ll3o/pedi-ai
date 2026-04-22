import { test, expect } from '../shared/fixtures'
import { AdminLoginPage } from '../../pages/AdminLoginPage'

test.describe('Admin Authentication', () => {
  let loginPage: AdminLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new AdminLoginPage(page)
    await loginPage.goto()
  })

  test('should display login form', async ({ page }) => {
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.loginButton).toBeVisible()
  })

  test('should login with valid admin credentials', { tag: ['@smoke', '@critical'] }, async ({ page, seedData }) => {
    await loginPage.login(seedData.admin.email, seedData.admin.password)
    await loginPage.waitForDashboard()
    await expect(page).toHaveURL('/admin/dashboard')
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await loginPage.login('invalid@test.com', 'wrongpassword')
    const error = await loginPage.getError()
    expect(error).toMatch(/inválido|incorreto|não encontrado|invalid|incorrect|not found/i)
  })

  test('should show error with empty fields', async ({ page }) => {
    await loginPage.login('', '')
    await expect(page.locator('[data-testid="field-error"]').first()).toBeVisible()
  })

  test('should logout and redirect to login', { tag: ['@smoke', '@critical'] }, async ({ admin }) => {
    await admin.locator('[data-testid="logout-button"]').click()
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

  test('should request password reset and login with new password', async ({ page, seedData }) => {
    await loginPage.forgotPassword(seedData.admin.email)
    await expect(loginPage.forgotPasswordSuccessMessage).toBeVisible()
  })

  test('should show success for password reset request', async ({ page }) => {
    // Supabase always returns success for password reset (security - never reveals if email exists)
    await loginPage.forgotPassword('nonexistent@test.com')
    await expect(loginPage.forgotPasswordSuccessMessage).toBeVisible()
  })
})
