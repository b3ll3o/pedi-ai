import { test, expect } from '../shared/fixtures'
import { TableQRPage } from '../../pages/TableQRPage'

/**
 * Testes E2E para validar o fluxo de redirect via QR Code.
 *
 * Cenários:
 * - 8.2.1: QR code válido redireciona para o cardápio
 * - 8.2.2: QR code inválido/expirado mostra erro
 */
test.describe('QR Code Redirect', () => {
  let tableQRPage: TableQRPage

  test.beforeEach(async ({ authenticated }) => {
    tableQRPage = new TableQRPage(authenticated)
  })

  /**
   * 8.2.1: QR code válido redireciona para o cardápio
   *
   * GIVEN customer scans valid QR code for active table
   * WHEN validation completes
   * THEN customer is redirected to /menu
   * AND table is associated with cart
   */
  test('8.2.1 - valid QR code redirects to menu and associates table with cart', { tag: ['@critical'] }, async ({ authenticated, seedData }) => {
    // Navigate to table QR validation page with valid table code
    await tableQRPage.goto(seedData.table.code)

    // Wait for validation to complete and success state
    await expect(authenticated.locator('[data-testid="table-info"]')).toBeVisible({ timeout: 10_000 })

    // Verify we're still on the table page (not yet redirected)
    await expect(authenticated).toHaveURL(new RegExp(`/table/${seedData.table.code}`))

    // Click the menu link to proceed
    await tableQRPage.proceedToMenu()

    // THEN: customer is redirected to /menu
    await expect(authenticated).toHaveURL(/\/menu/)

    // Verify menu page is displayed
    await expect(authenticated.locator('[data-testid="page-title"]')).toContainText('Cardápio')

    // AND: table is associated (cart should show table info or table context)
    // This can be verified via cart badge or table indicator
    const cartBadge = authenticated.locator('[data-testid="cart-badge"]')
    await expect(cartBadge).toBeVisible()
  })

  /**
   * 8.2.2: QR code inválido mostra erro e não redireciona
   *
   * GIVEN customer scans invalid or expired QR code
   * WHEN validation fails
   * THEN customer sees error message
   * AND customer is NOT redirected to menu
   */
  test('8.2.2 - invalid QR code shows error and does not redirect', { tag: ['@smoke'] }, async ({ authenticated }) => {
    // Use an invalid/exired table code
    const invalidCode = 'INVALID-EXPIRED-CODE-12345'

    // Navigate to table QR validation page with invalid code
    await tableQRPage.goto(invalidCode)

    // THEN: customer sees error message
    await expect(authenticated.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 10_000 })
    const errorText = await tableQRPage.getError()
    expect(errorText).toMatch(/inválido|expirado|não encontrado/i)

    // AND: customer is NOT redirected to menu (stays on table page)
    await expect(authenticated).toHaveURL(new RegExp(`/table/${invalidCode}`))

    // Verify there's no menu link visible (only back to home link)
    const menuLink = authenticated.locator('[data-testid="menu-link"]')
    await expect(menuLink).not.toBeVisible()
  })

  test('8.2.1 variant - valid QR code shows table info before redirect', async ({ authenticated, seedData }) => {
    // Navigate to table QR validation page
    await tableQRPage.goto(seedData.table.code)

    // Wait for success state - table info should be visible
    await expect(authenticated.locator('[data-testid="table-info"]')).toBeVisible({ timeout: 10_000 })

    // Verify table info contains expected content (welcome message)
    const tableInfo = authenticated.locator('[data-testid="table-info"]')
    await expect(tableInfo).toContainText(/Mesa|Bem-vindo/i)

    // Verify menu link is present
    await expect(authenticated.locator('[data-testid="menu-link"]')).toBeVisible()
    await expect(authenticated.locator('[data-testid="menu-link"]')).toContainText(/Cardápio|menu/i)
  })
})
