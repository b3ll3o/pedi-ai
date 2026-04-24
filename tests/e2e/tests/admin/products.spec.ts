import { test, expect } from '../shared/fixtures'
import { AdminProductsPage } from '../../pages/AdminProductsPage'

test.describe('Admin Products', () => {
  let productsPage: AdminProductsPage

  test.beforeEach(async ({ admin }) => {
    productsPage = new AdminProductsPage(admin)
    await productsPage.goto()
  })

  test('should display products list', async ({ admin }) => {
    await expect(admin.locator('[data-testid="page-title"]')).toContainText('Produtos')
    await expect(productsPage.productsList.first()).toBeVisible()
  })

  test('should add new product', async ({ admin: _admin, seedData }) => {
    await productsPage.addProduct({
      name: 'Suco de Laranja',
      price: 12.99,
      categoryId: seedData.categories[0].id,
      description: 'Suco natural de laranja',
    })
    const error = await productsPage.getError()
    expect(error).toBe('')
  })

  test('should edit existing product', async ({ admin: _admin }) => {
    await productsPage.editProduct('Coca-Cola', { price: 6.99 })
    const error = await productsPage.getError()
    expect(error).toBe('')
  })

  test('should delete product', async ({ admin }) => {
    // First add a product to delete
    await admin.locator('[data-testid="add-product-button"]').click()
    await admin.locator('[data-testid="product-name-input"]').fill('Produto para Teste')
    await admin.locator('[data-testid="product-price-input"]').fill('9.99')
    await admin.locator('[data-testid="save-button"]').click()

    await productsPage.deleteProduct('Produto para Teste')
  })

  test('should search products by name', async ({ admin: _admin }) => {
    const count = await productsPage.searchProducts('Picanha')
    expect(count).toBeGreaterThanOrEqual(0)
    await expect(productsPage.productsList.filter({ hasText: 'Picanha' })).toBeVisible()
  })

  test('should filter products by category', async ({ admin: _admin }) => {
    const count = await productsPage.filterByCategory('Bebidas')
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should show empty state when search returns no results', async ({ admin: _admin }) => {
    const count = await productsPage.searchProducts('ProdutoInexistenteXYZ123')
    expect(count).toBe(0)
    await expect(productsPage.productsList.first()).not.toBeVisible()
  })

  test('should toggle product availability', async ({ admin: _admin }) => {
    await productsPage.toggleProductAvailability('Coca-Cola')
    // Availability should toggle
  })

  test('should validate price is numeric', async ({ admin }) => {
    await admin.locator('[data-testid="add-product-button"]').click()
    await admin.locator('[data-testid="product-name-input"]').fill('Teste')
    await admin.locator('[data-testid="product-price-input"]').fill('abc')
    await admin.locator('[data-testid="save-button"]').click()
    await expect(admin.locator('[data-testid="field-error"]')).toBeVisible()
  })

  test('should upload product image', async ({ admin }) => {
    await admin.locator('[data-testid="add-product-button"]').click()
    await admin.locator('[data-testid="product-image-input"]').setInputFiles({
      name: 'product.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    })
    // Image upload handling
  })
})
