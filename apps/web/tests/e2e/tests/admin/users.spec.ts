import { test, expect } from '../shared/fixtures'
import { AdminUsersPage } from '../../pages/AdminUsersPage'

test.describe('Admin Users Management', () => {
  let usersPage: AdminUsersPage
  const TEST_EMAIL_PREFIX = `e2e_user_${Date.now()}`

  test.beforeEach(async ({ admin }) => {
    usersPage = new AdminUsersPage(admin)
    await usersPage.goto()
    await usersPage.waitForLoad()
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

  test('should display users page', async () => {
    await expect(usersPage.userList).toBeVisible()
    await expect(usersPage.addButton).toBeVisible()
  })

  test('should list users', async () => {
    const userCount = await usersPage.getUserCount()
    expect(userCount).toBeGreaterThanOrEqual(0)
  })

  test('should open add user modal', async () => {
    await usersPage.openAddModal()
    await expect(usersPage.emailInput).toBeVisible()
    await expect(usersPage.roleSelect).toBeVisible()
  })

  test('should invite a new user', async () => {
    const email = `${TEST_EMAIL_PREFIX}@test.com`

    await usersPage.openAddModal()
    await usersPage.fillUserForm({
      email,
      role: 'garcom',
    })
    await usersPage.saveUser()

    await expect(usersPage.successMessage).toBeVisible({ timeout: 5000 })
  })

  test('should cancel user invitation', async () => {
    await usersPage.openAddModal()
    await usersPage.fillUserForm({
      email: 'should_not_save@test.com',
      role: 'garcom',
    })
    await usersPage.cancelForm()

    await expect(usersPage.modal).not.toBeVisible()
  })

  test('should show error when inviting with invalid email', async () => {
    await usersPage.openAddModal()
    await usersPage.fillUserForm({
      email: 'invalid-email',
      role: 'garcom',
    })
    await usersPage.saveUser()

    await expect(usersPage.errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('should show error when inviting without email', async () => {
    await usersPage.openAddModal()
    await usersPage.fillUserForm({
      role: 'garcom',
    })
    await usersPage.saveUser()

    await expect(usersPage.errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})
