import { test, expect } from '../shared/fixtures'

test.describe('Offline Functionality', () => {
  test('should display offline indicator when network is down', async ({ guest }) => {
    // Simulate offline
    await guest.context().setOffline(true)
    await guest.goto('/menu')
    await expect(guest.locator('[data-testid="offline-indicator"]')).toBeVisible()
  })

  test('should cache menu data for offline access', async ({ guest }) => {
    // First visit to cache data
    await guest.goto('/menu')
    await expect(guest.locator('[data-testid="product-card"]').first()).toBeVisible()

    // Go offline
    await guest.context().setOffline(true)
    await guest.goto('/menu')

    // Should still show cached products
    await expect(guest.locator('[data-testid="product-card"]').first()).toBeVisible()
  })

  test('should queue cart operations when offline', async ({ guest }) => {
    await guest.goto('/menu')

    // Go offline
    await guest.context().setOffline(true)

    // Try to add to cart
    await guest.locator('[data-testid="product-card"]').first().locator('[data-testid="add-to-cart-button"]').click()

    // Should show queued indicator
    await expect(guest.locator('[data-testid="offline-queue-indicator"]')).toBeVisible()
  })

  test('should sync queued operations when back online', async ({ guest }) => {
    // Queue some operations offline
    await guest.context().setOffline(true)
    await guest.goto('/menu')
    await guest.locator('[data-testid="product-card"]').first().locator('[data-testid="add-to-cart-button"]').click()

    // Go back online
    await guest.context().setOffline(false)

    // Should sync
    await expect(guest.locator('[data-testid="sync-success"]')).toBeVisible({ timeout: 30_000 })
  })

  test('should display cached order status when offline', async ({ guest }) => {
    // Visit order page to cache
    await guest.goto('/order/test-order-123')
    await expect(guest.locator('[data-testid="order-status"]')).toBeVisible()

    // Go offline
    await guest.context().setOffline(true)
    await guest.goto('/order/test-order-123')

    // Should show cached status
    await expect(guest.locator('[data-testid="order-status"]')).toBeVisible()
    await expect(guest.locator('[data-testid="offline-indicator"]')).toBeVisible()
  })

  test('should handle checkout failure when offline', async ({ guest }) => {
    await guest.goto('/checkout')
    await guest.context().setOffline(true)

    await guest.locator('[data-testid="submit-order-button"]').click()

    // Should show offline error
    await expect(guest.locator('[data-testid="offline-error"]')).toBeVisible()
  })
})
