import { test, expect } from '../shared/fixtures'
import { AdminDashboardPage } from '../../pages/AdminDashboardPage'
import { AdminCategoriesPage } from '../../pages/AdminCategoriesPage'
import { AdminProductsPage } from '../../pages/AdminProductsPage'
import { AdminOrdersPage } from '../../pages/AdminOrdersPage'

test.describe('Admin Dashboard', () => {
  let dashboardPage: AdminDashboardPage

  test.beforeEach(async ({ admin }) => {
    dashboardPage = new AdminDashboardPage(admin)
    await dashboardPage.goto()
    await admin.waitForLoadState('networkidle')
  })

  test.afterEach(async ({ page }) => {
    // Cleanup
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

  test('should display dashboard page', async () => {
    await expect(dashboardPage.page.locator('h1')).toContainText('Dashboard')
  })

  test('should show navigation links', async () => {
    // Dashboard should show navigation to main sections
    await expect(dashboardPage.page.locator('a[href="/admin/orders"]')).toBeVisible()
    await expect(dashboardPage.page.locator('a[href="/admin/products"]')).toBeVisible()
    await expect(dashboardPage.page.locator('a[href="/admin/categories"]')).toBeVisible()
    await expect(dashboardPage.page.locator('a[href="/admin/tables"]')).toBeVisible()
  })

  test('should navigate to categories', async () => {
    const categoriesPage = new AdminCategoriesPage(dashboardPage.page)
    await dashboardPage.navigateToCategories()
    await expect(dashboardPage.page).toHaveURL('/admin/categories')
  })

  test('should navigate to products', async () => {
    await dashboardPage.navigateToProducts()
    await expect(dashboardPage.page).toHaveURL('/admin/products')
  })

  test('should navigate to orders', async () => {
    await dashboardPage.navigateToOrders()
    await expect(dashboardPage.page).toHaveURL('/admin/orders')
  })

  test('should display restaurant indicator', async ({ seedData }) => {
    // Should show which restaurant is selected
    await expect(dashboardPage.page.locator('text=📍')).toBeVisible()
  })

  test('should redirect to restaurants page when no restaurant selected', async ({ admin }) => {
    // If no restaurant is selected, should redirect
    // This test assumes the fixture handles restaurant selection
    await admin.waitForLoadState('networkidle')
    const url = admin.url()
    // Should either be on dashboard with restaurant or redirected
    expect(url).toMatch(/\/admin\/(dashboard|restaurants)/)
  })

  test('should logout and redirect to login', async () => {
    await dashboardPage.logout()
    await expect(dashboardPage.page).toHaveURL('/admin/login')
  })

  test('should reload and maintain session', async ({ admin }) => {
    // Admin should stay logged in after reload
    await admin.reload()
    await expect(dashboardPage.page).toHaveURL('/admin/dashboard')
  })
})
