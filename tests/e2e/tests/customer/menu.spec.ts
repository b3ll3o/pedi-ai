import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'

test.describe('Menu', () => {
  let menuPage: MenuPage

  test.beforeEach(async ({ authenticated }) => {
    menuPage = new MenuPage(authenticated)
    await menuPage.goto()
  })

  test('should display menu page with categories', { tag: '@smoke' }, async ({ authenticated }) => {
    await expect(authenticated).toHaveURL(/\/menu/)
    await expect(authenticated.locator('[data-testid="page-title"]')).toContainText('Cardápio')
    await expect(menuPage.categoryTabs.first()).toBeVisible()
  })

  test('should display products for selected category', async ({ authenticated }) => {
    const menu = new MenuPage(authenticated)
    await menu.selectCategory('Bebidas')
    await expect(authenticated).toHaveURL(/\/menu\/.+/)
    await expect(menu.productCards.first()).toBeVisible()
  })

  test('should filter products by search query', async ({ authenticated }) => {
    const menu = new MenuPage(authenticated)
    // First select a category to see products
    await menu.selectCategory('Bebidas')
    // Then search
    await menu.search('Coca')
    await expect(menu.productCards.filter({ hasText: 'Coca-Cola' })).toBeVisible()
  })

  test('should add product to cart', async ({ authenticated }) => {
    const menu = new MenuPage(authenticated)
    // First select a category to see products
    await menu.selectCategory('Bebidas')
    await menu.addProductToCart('Coca-Cola')
    await expect(authenticated.locator('[data-testid="cart-badge"]')).toContainText('1')
  })

  test('should view product details', async ({ authenticated }) => {
    const menu = new MenuPage(authenticated)
    // First select a category to see products
    await menu.selectCategory('Pratos Principais')
    await menu.viewProduct('Picanha 300g')
    await expect(authenticated).toHaveURL(/\/product\//)
  })

  test('should display product price correctly', async ({ authenticated }) => {
    const menu = new MenuPage(authenticated)
    // First select a category to see products
    await menu.selectCategory('Bebidas')
    const price = await menu.getProductPrice('Coca-Cola')
    expect(await price.textContent()).toMatch(/R\$\s*[\d,]+/)
  })

  test('should navigate between categories', async ({ authenticated }) => {
    const menu = new MenuPage(authenticated)

    // Select first category and verify we're on the category page
    await menu.selectCategory('Bebidas')
    await expect(authenticated).toHaveURL(/\/menu\/.+/)

    // Navigate back to menu and verify category list is visible
    await authenticated.goto('/menu')
    await expect(menu.categoryTabs.filter({ hasText: 'Bebidas' })).toBeVisible()

    // Select another category
    await menu.selectCategory('Pratos Principais')
    await expect(authenticated).toHaveURL(/\/menu\/.+/)
  })
})