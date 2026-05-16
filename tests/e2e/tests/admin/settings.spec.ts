import { test, expect } from '../shared/fixtures'
import { AdminSettingsPage } from '../../pages/AdminSettingsPage'

test.describe('Admin Settings', () => {
  let settingsPage: AdminSettingsPage

  test.beforeEach(async ({ admin }) => {
    settingsPage = new AdminSettingsPage(admin)
    await settingsPage.goto()
    await settingsPage.waitForLoad()
  })

  test.afterEach(async ({ page }) => {
    try {
      await page.context().clearCookies()
    } catch { /* ignore */ }
    try {
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
    } catch { /* ignore */ }
  })

  test('should display settings page', async () => {
    await expect(settingsPage.restaurantNameInput).toBeVisible()
    await expect(settingsPage.saveButton).toBeVisible()
  })

  test('should load existing settings', async () => {
    const settings = await settingsPage.getSettings()
    expect(settings.restaurantName).toBeTruthy()
  })

  test('should update restaurant name', async () => {
    const newName = `Restaurante Teste ${Date.now()}`

    await settingsPage.fillSettings({ restaurantName: newName })
    await settingsPage.save()

    await expect(settingsPage.successMessage).toBeVisible({ timeout: 5000 })
  })

  test('should update opening hours', async () => {
    await settingsPage.fillSettings({
      openTime: '09:00',
      closeTime: '23:00',
    })
    await settingsPage.save()

    await expect(settingsPage.successMessage).toBeVisible({ timeout: 5000 })
  })

  test('should update contact information', async () => {
    await settingsPage.fillSettings({
      phone: '(11) 99999-9999',
      address: 'Rua Teste, 123 - São Paulo, SP',
    })
    await settingsPage.save()

    await expect(settingsPage.successMessage).toBeVisible({ timeout: 5000 })
  })

  test('should show error when save fails', async () => {
    // Clear the restaurant name to trigger validation error
    await settingsPage.restaurantNameInput.clear()
    await settingsPage.save()

    await expect(settingsPage.errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin/configuracoes')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
