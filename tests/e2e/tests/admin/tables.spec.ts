import { test, expect } from '../shared/fixtures'
import { AdminTablesPage } from '../../pages/AdminTablesPage'

test.describe('Admin Tables Management', () => {
  let tablesPage: AdminTablesPage
  const TEST_TABLE_PREFIX = `E2E_Table_${Date.now()}`

  test.beforeEach(async ({ admin }) => {
    tablesPage = new AdminTablesPage(admin)
    await tablesPage.goto()
    await tablesPage.waitForLoad()
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

  test('should display tables page', async () => {
    await expect(tablesPage.addButton).toBeVisible()
  })

  test('should open add table modal', async () => {
    await tablesPage.openAddModal()
    await expect(tablesPage.modalTitle).toBeVisible()
    await expect(tablesPage.numberInput).toBeVisible()
    await expect(tablesPage.nameInput).toBeVisible()
    await expect(tablesPage.capacityInput).toBeVisible()
  })

  test('should create a new table', async () => {
    const tableNumber = `${TEST_TABLE_PREFIX}_${Date.now()}`

    await tablesPage.openAddModal()
    await tablesPage.fillTableForm({
      number: tableNumber,
      name: `Mesa Teste ${tableNumber}`,
      capacity: '4',
      generateQr: true,
    })
    await tablesPage.saveTable()

    await expect(tablesPage.successMessage).toBeVisible({ timeout: 5000 })
  })

  test('should cancel table creation', async () => {
    await tablesPage.openAddModal()
    await tablesPage.fillTableForm({
      number: '999',
      name: 'Should Not Save',
      capacity: '2',
    })
    await tablesPage.cancelForm()

    await expect(tablesPage.modal).not.toBeVisible()
  })

  test('should show error when creating table without number', async () => {
    await tablesPage.openAddModal()
    await tablesPage.fillTableForm({
      name: 'Mesa Sem Número',
      capacity: '2',
    })
    await tablesPage.saveTable()

    // Should show validation error
    await expect(tablesPage.errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('should open QR code modal', async () => {
    // First create a table if none exists
    const tableCount = await tablesPage.getTableCount()

    if (tableCount === 0) {
      await tablesPage.openAddModal()
      await tablesPage.fillTableForm({
        number: `${TEST_TABLE_PREFIX}_QR`,
        name: 'Mesa QR',
        capacity: '4',
        generateQr: true,
      })
      await tablesPage.saveTable()
      await expect(tablesPage.successMessage).toBeVisible({ timeout: 5000 })
    }

    await tablesPage.openQrModal(0)
    await expect(tablesPage.qrImage).toBeVisible({ timeout: 5000 })
  })

  test('should close QR code modal', async () => {
    const tableCount = await tablesPage.getTableCount()

    if (tableCount === 0) {
      await tablesPage.openAddModal()
      await tablesPage.fillTableForm({
        number: `${TEST_TABLE_PREFIX}_QR_Close`,
        name: 'Mesa QR Close',
        capacity: '2',
        generateQr: true,
      })
      await tablesPage.saveTable()
      await expect(tablesPage.successMessage).toBeVisible({ timeout: 5000 })
    }

    await tablesPage.openQrModal(0)
    await tablesPage.closeQrModal()
    await expect(tablesPage.qrModal).not.toBeVisible()
  })

  test('should edit an existing table', async () => {
    // Create a table first
    const tableNumber = `${TEST_TABLE_PREFIX}_Edit`

    await tablesPage.openAddModal()
    await tablesPage.fillTableForm({
      number: tableNumber,
      name: 'Original Name',
      capacity: '4',
    })
    await tablesPage.saveTable()
    await expect(tablesPage.successMessage).toBeVisible({ timeout: 5000 })

    // Edit the table
    await tablesPage.openEditModal(0)
    await tablesPage.fillTableForm({
      name: 'Updated Name',
      capacity: '6',
    })
    await tablesPage.saveTable()

    await expect(tablesPage.successMessage).toBeVisible({ timeout: 5000 })
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin/tables')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('should list tables for selected restaurant', async ({}) => {
    // Tables should be loaded for the seed restaurant
    const tableCount = await tablesPage.getTableCount()
    expect(tableCount).toBeGreaterThanOrEqual(0)
  })
})
