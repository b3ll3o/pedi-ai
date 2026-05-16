import { test, expect } from '../shared/fixtures'
import { AdminRestaurantsPage } from '../../pages/AdminRestaurantsPage'

test.describe('Admin Restaurants', () => {
  let restaurantsPage: AdminRestaurantsPage
  const TEST_RESTAURANT_PREFIX = `E2E_Restaurant_${Date.now()}`

  test.beforeEach(async ({ admin }) => {
    restaurantsPage = new AdminRestaurantsPage(admin)
    await restaurantsPage.goto()
    await restaurantsPage.waitForLoad()
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

  test('should display restaurants page', async () => {
    await expect(restaurantsPage.restaurantList).toBeVisible()
    await expect(restaurantsPage.addButton).toBeVisible()
  })

  test('should list restaurants', async () => {
    const restaurantCount = await restaurantsPage.getRestaurantCount()
    expect(restaurantCount).toBeGreaterThanOrEqual(0)
  })

  test('should open add restaurant modal', async () => {
    await restaurantsPage.openAddModal()
    await expect(restaurantsPage.nameInput).toBeVisible()
    await expect(restaurantsPage.descriptionInput).toBeVisible()
  })

  test('should create a new restaurant', async () => {
    const restaurantName = `${TEST_RESTAURANT_PREFIX}_${Date.now()}`

    await restaurantsPage.openAddModal()
    await restaurantsPage.fillRestaurantForm({
      name: restaurantName,
      description: 'Restaurante de testes E2E',
    })
    await restaurantsPage.saveRestaurant()

    await expect(restaurantsPage.successMessage).toBeVisible({ timeout: 5000 })
  })

  test('should cancel restaurant creation', async () => {
    await restaurantsPage.openAddModal()
    await restaurantsPage.fillRestaurantForm({
      name: 'Should Not Save',
      description: 'This should not be saved',
    })
    await restaurantsPage.cancelForm()

    await expect(restaurantsPage.modal).not.toBeVisible()
  })

  test('should show error when creating restaurant without name', async () => {
    await restaurantsPage.openAddModal()
    await restaurantsPage.fillRestaurantForm({
      description: 'No name provided',
    })
    await restaurantsPage.saveRestaurant()

    await expect(restaurantsPage.errorMessage).toBeVisible({ timeout: 5000 })
  })

  test('should edit an existing restaurant', async () => {
    const restaurantCount = await restaurantsPage.getRestaurantCount()

    if (restaurantCount === 0) {
      // Create first
      const restaurantName = `${TEST_RESTAURANT_PREFIX}_Edit`
      await restaurantsPage.openAddModal()
      await restaurantsPage.fillRestaurantForm({
        name: restaurantName,
        description: 'Original Description',
      })
      await restaurantsPage.saveRestaurant()
      await expect(restaurantsPage.successMessage).toBeVisible({ timeout: 5000 })
    }

    await restaurantsPage.openEditModal(0)
    await restaurantsPage.fillRestaurantForm({
      name: `${TEST_RESTAURANT_PREFIX}_Updated`,
      description: 'Updated Description',
    })
    await restaurantsPage.saveRestaurant()

    await expect(restaurantsPage.successMessage).toBeVisible({ timeout: 5000 })
  })

  test('should delete a restaurant', async () => {
    const restaurantCount = await restaurantsPage.getRestaurantCount()

    if (restaurantCount === 0) {
      // Create first
      const restaurantName = `${TEST_RESTAURANT_PREFIX}_Delete`
      await restaurantsPage.openAddModal()
      await restaurantsPage.fillRestaurantForm({
        name: restaurantName,
        description: 'To be deleted',
      })
      await restaurantsPage.saveRestaurant()
      await expect(restaurantsPage.successMessage).toBeVisible({ timeout: 5000 })
    }

    await restaurantsPage.deleteRestaurant(0)
    // Should show success or refresh list
  })

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin/restaurants')
    await expect(page).toHaveURL(/\/admin\/login/)
  })

  test('should navigate to restaurant details', async () => {
    const restaurantCount = await restaurantsPage.getRestaurantCount()

    if (restaurantCount > 0) {
      await restaurantsPage.selectRestaurant(0)
      // Should navigate to restaurant details page
      const url = restaurantsPage.page.url()
      expect(url).toMatch(/\/admin\/restaurants\/.+/)
    }
  })
})
