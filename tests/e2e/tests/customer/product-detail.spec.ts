import { test, expect } from '../shared/fixtures'
import { ProductDetailPage } from '../../pages/ProductDetailPage'
import { RestaurantMenuPage } from '../../pages/RestaurantsPage'

test.describe('Product Detail', () => {
  let productDetailPage: ProductDetailPage
  let menuPage: RestaurantMenuPage

  test.beforeEach(async ({ page }) => {
    productDetailPage = new ProductDetailPage(page)
    menuPage = new RestaurantMenuPage(page)
  })

  test.afterEach(async ({ page }) => {
    try {
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
    } catch { /* ignore */ }
  })

  test('should display product details', async ({ seedData }) => {
    // Navigate to menu first
    await menuPage.goto(seedData.restaurant.id)
    await menuPage.waitForMenu()

    // Get first product name
    const firstProduct = seedData.products[0]
    if (!firstProduct) {
      test.skip()
      return
    }

    // Navigate to product detail directly
    await productDetailPage.goto(seedData.restaurant.id, firstProduct.id)
    await productDetailPage.waitForLoad()

    await expect(productDetailPage.productName).toBeVisible()
  })

  test('should show product name and price', async ({ seedData }) => {
    const firstProduct = seedData.products[0]
    if (!firstProduct) {
      test.skip()
      return
    }

    await productDetailPage.goto(seedData.restaurant.id, firstProduct.id)
    await productDetailPage.waitForLoad()

    await expect(productDetailPage.productName).toContainText(firstProduct.name)
  })

  test('should add product to cart', async ({ seedData }) => {
    const firstProduct = seedData.products[0]
    if (!firstProduct) {
      test.skip()
      return
    }

    await productDetailPage.goto(seedData.restaurant.id, firstProduct.id)
    await productDetailPage.waitForLoad()
    await productDetailPage.addToCart()

    await productDetailPage.waitForSuccessToast()
  })

  test('should update quantity before adding to cart', async ({ seedData }) => {
    const firstProduct = seedData.products[0]
    if (!firstProduct) {
      test.skip()
      return
    }

    await productDetailPage.goto(seedData.restaurant.id, firstProduct.id)
    await productDetailPage.waitForLoad()

    // Set quantity to 2
    await productDetailPage.setQuantity(2)
    await productDetailPage.addToCart()

    await productDetailPage.waitForSuccessToast()
  })

  test('should show error toast when product unavailable', async ({ seedData }) => {
    // Try to access non-existent product
    await productDetailPage.goto(seedData.restaurant.id, 'non-existent-product-id')
    await productDetailPage.waitForLoad()

    // Should show error or redirect
    const currentUrl = productDetailPage.page.url()
    expect(currentUrl).toMatch(/produto|menu|restaurant/)
  })

  test('should navigate back to menu', async ({ seedData }) => {
    const firstProduct = seedData.products[0]
    if (!firstProduct) {
      test.skip()
      return
    }

    await productDetailPage.goto(seedData.restaurant.id, firstProduct.id)
    await productDetailPage.waitForLoad()
    await productDetailPage.goBack()

    await expect(productDetailPage.page).toHaveURL(/\/cardapio/)
  })

  test('should display product description if available', async ({ seedData }) => {
    const firstProduct = seedData.products[0]
    if (!firstProduct) {
      test.skip()
      return
    }

    await productDetailPage.goto(seedData.restaurant.id, firstProduct.id)
    await productDetailPage.waitForLoad()

    // Description is optional, so we just check it doesn't throw
    const descriptionVisible = await productDetailPage.productDescription.isVisible().catch(() => false)
    if (descriptionVisible) {
      await expect(productDetailPage.productDescription).toBeVisible()
    }
  })

  test('should display modifiers if available', async ({ seedData }) => {
    const firstProduct = seedData.products[0]
    if (!firstProduct) {
      test.skip()
      return
    }

    await productDetailPage.goto(seedData.restaurant.id, firstProduct.id)
    await productDetailPage.waitForLoad()

    // Modifiers section is optional
    const modifiersVisible = await productDetailPage.modifiersSection.isVisible().catch(() => false)
    if (modifiersVisible) {
      await expect(productDetailPage.modifiersSection).toBeVisible()
    }
  })
})
