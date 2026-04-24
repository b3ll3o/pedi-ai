import { test, expect } from '../shared/fixtures'
import { TableQRPage } from '../../pages/TableQRPage'

test.describe('Table QR Code', () => {
  let tableQRPage: TableQRPage

  test.beforeEach(async ({ page }) => {
    tableQRPage = new TableQRPage(page)
  })

  test('should display table validation form', async ({ admin }) => {
    await admin.goto('/admin/tables')
    await expect(admin.locator('[data-testid="page-title"]')).toContainText('Mesas')
  })

  test('should validate table code', async ({ admin: _admin, seedData }) => {
    await tableQRPage.goto()
    await tableQRPage.validateTable(seedData.table.code)
    const info = await tableQRPage.getTableInfo()
    expect(info.code).toBe(seedData.table.code)
  })

  test('should show error for invalid table code', async ({ admin: _admin }) => {
    await tableQRPage.goto()
    await tableQRPage.validateTable('INVALID-CODE')
    const error = await tableQRPage.getError()
    expect(error).toMatch(/inválido|não encontrado/i)
  })

  test('should generate QR code for table', async ({ admin: _admin, seedData }) => {
    await tableQRPage.goto(seedData.table.code)
    const qrCode = await tableQRPage.getQRCodeValue()
    expect(qrCode).toContain('data:image')
  })

  test('should download table QR code', async ({ admin, seedData }) => {
    await tableQRPage.goto(seedData.table.code)
    const downloadPromise = admin.waitForEvent('download')
    await tableQRPage.downloadQRCode()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/qr.*\.png|qr.*\.jpg/)
  })

  test('should link table to menu', async ({ admin, seedData }) => {
    await tableQRPage.goto(seedData.table.code)
    await tableQRPage.proceedToMenu()
    await expect(admin).toHaveURL('/menu')
  })

  test('should display table information', async ({ admin: _admin, seedData }) => {
    await tableQRPage.goto(seedData.table.code)
    const info = await tableQRPage.getTableInfo()
    expect(info.code).toBeTruthy()
  })

  test('should list all tables in admin', async ({ admin }) => {
    await admin.goto('/admin/tables')
    await expect(admin.locator('[data-testid="table-item"]').first()).toBeVisible()
  })

  test('should add new table', async ({ admin }) => {
    await admin.goto('/admin/tables')
    await admin.locator('[data-testid="add-table-button"]').click()
    await admin.locator('[data-testid="table-name-input"]').fill('Mesa 15')
    await admin.locator('[data-testid="generate-qr-checkbox"]').check()
    await admin.locator('[data-testid="save-button"]').click()
    await expect(admin.locator('[data-testid="success-message"]')).toBeVisible()
  })

  test('should edit table', async ({ admin }) => {
    await admin.goto('/admin/tables')
    await admin.locator('[data-testid="table-item"]').first().locator('[data-testid="edit-button"]').click()
    await admin.locator('[data-testid="table-name-input"]').fill('Mesa Renomeada')
    await admin.locator('[data-testid="save-button"]').click()
    await expect(admin.locator('[data-testid="success-message"]')).toBeVisible()
  })
})
