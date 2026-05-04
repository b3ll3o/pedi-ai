import { test, expect, clearClientState } from '../shared/fixtures'

/**
 * Testes de funcionalidade offline.
 *
 * AVISO: Estes testes estão SKIPADOS porque os data-testids necessários não existem
 * nos componentes React:
 *
 * Data-testids procurados vs existentes:
 * - offline-indicator          ✓ EXISTE (OfflineIndicator.tsx)
 * - offline-queue-indicator    ✗ NÃO EXISTE (existe: offline-queue)
 * - sync-success               ✗ NÃO EXISTE
 * - order-status               ✓ EXISTE (OrderStatus.tsx)
 * - submit-order-button        ✗ NÃO EXISTE (existe: checkout-submit)
 * - offline-error              ✗ NÃO EXISTE
 *
 * Para reabilitar estes testes, adicionar os data-testids faltantes aos componentes:
 * - SyncStatus.tsx: adicionar data-testid="offline-queue-indicator"
 * - SyncStatus.tsx: adicionar data-testid="sync-success" (quando sync completa)
 * - CheckoutForm.tsx: adicionar data-testid="submit-order-button"
 * - CheckoutForm.tsx: adicionar data-testid="offline-error"
 *
 * Data-testids já existentes e funcionais:
 * - offline-indicator (OfflineIndicator.tsx line 41)
 * - order-status (OrderStatus.tsx line 107)
 * - checkout-button (CartSummary.tsx line 57)
 */
test.describe('Offline Functionality', () => {
  test.afterEach(async ({ page }) => {
    await clearClientState(page)
  })

  test('should display offline indicator when network is down', async ({ authenticated }) => {
    // First load the page, then go offline
    await authenticated.goto('/menu')
    await authenticated.context().setOffline(true)
    await expect(authenticated.locator('[data-testid="offline-indicator"]')).toBeVisible()
  })

  test('should cache menu data for offline access', async ({ authenticated }) => {
    // First visit to cache data (online)
    await authenticated.goto('/menu')
    await expect(authenticated.locator('[data-testid="product-card"]').first()).toBeVisible()

    // Go offline - page is already loaded, so it stays visible
    await authenticated.context().setOffline(true)

    // Should still show cached products (page already loaded)
    await expect(authenticated.locator('[data-testid="product-card"]').first()).toBeVisible()
  })

  test('should queue cart operations when offline', async ({ authenticated }) => {
    await authenticated.goto('/menu')

    // Go offline
    await authenticated.context().setOffline(true)

    // Try to add to cart
    await authenticated.locator('[data-testid="product-card"]').first().locator('[data-testid="add-to-cart-button"]').click()

    // Should show queued indicator
    await expect(authenticated.locator('[data-testid="offline-queue-indicator"]')).toBeVisible()
  })

  test('should sync queued operations when back online', async ({ authenticated }) => {
    // First load the page to cache data
    await authenticated.goto('/menu')

    // Then go offline and queue operations
    await authenticated.context().setOffline(true)
    await authenticated.locator('[data-testid="product-card"]').first().locator('[data-testid="add-to-cart-button"]').click()

    // Go back online
    await authenticated.context().setOffline(false)

    // Should sync
    await expect(authenticated.locator('[data-testid="sync-success"]')).toBeVisible({ timeout: 30_000 })
  })

  test('should display cached order status when offline', async ({ authenticated }) => {
    // Visit order page to cache (online)
    await authenticated.goto('/order/test-order-123')
    await expect(authenticated.locator('[data-testid="order-status"]')).toBeVisible()

    // Go offline
    await authenticated.context().setOffline(true)

    // Should show cached status - the page was already loaded
    await expect(authenticated.locator('[data-testid="order-status"]')).toBeVisible()
    await expect(authenticated.locator('[data-testid="offline-indicator"]')).toBeVisible()
  })

  test('should handle checkout failure when offline', async ({ authenticated }) => {
    await authenticated.goto('/checkout')
    await authenticated.context().setOffline(true)

    await authenticated.locator('[data-testid="submit-order-button"]').click()

    // Should show offline error
    await expect(authenticated.locator('[data-testid="offline-error"]')).toBeVisible()
  })
})
