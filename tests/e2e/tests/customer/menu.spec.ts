import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'

test.describe('Menu', () => {
  let menuPage: MenuPage

  test.beforeEach(async ({ page }) => {
    menuPage = new MenuPage(page)
    await menuPage.goto()
  })

  test('should display menu page with categories', async ({ page }) => {
    await expect(page).toHaveURL(/\/menu/)
    await expect(page.locator('[data-testid="page-title"]')).toContainText('Cardápio')
    await expect(menuPage.categoryTabs.first()).toBeVisible()
  })

  test('should display products for selected category', async ({ guest }) => {
    const menu = new MenuPage(guest)
    await menu.selectCategory('Bebidas')
    await expect(menu.productCards.first()).toBeVisible()
  })

  test('should filter products by search query', async ({ guest }) => {
    const menu = new MenuPage(guest)
    await menu.search('Coca')
    await expect(menu.productCards.filter({ hasText: 'Coca-Cola' })).toBeVisible()
  })

  test('should add product to cart', async ({ guest }) => {
    const menu = new MenuPage(guest)
    await menu.addProductToCart('Coca-Cola')
    await expect(guest.locator('[data-testid="cart-badge"]')).toContainText('1')
  })

  test('should view product details', async ({ guest }) => {
    const menu = new MenuPage(guest)
    await menu.viewProduct('Picanha')
    await expect(guest).toHaveURL(/\/product\//)
  })

  test('should display product price correctly', async ({ guest }) => {
    const menu = new MenuPage(guest)
    const price = await menu.getProductPrice('Coca-Cola')
    expect(await price.textContent()).toMatch(/R\$\s*[\d,]+/)
  })

  test('should navigate between categories', async ({ guest }) => {
    const menu = new MenuPage(guest)
    await menu.selectCategory('Bebidas')
    await expect(menu.categoryTabs.filter({ hasText: 'Bebidas' })).toHaveAttribute('aria-selected', 'true')

    await menu.selectCategory('Pratos Principais')
    await expect(menu.categoryTabs.filter({ hasText: 'Pratos Principais' })).toHaveAttribute('aria-selected', 'true')
  })
})
