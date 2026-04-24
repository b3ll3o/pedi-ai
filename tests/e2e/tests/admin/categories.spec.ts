import { test, expect } from '../shared/fixtures'
import { AdminCategoriesPage } from '../../pages/AdminCategoriesPage'

test.describe('Admin Categories', () => {
  let categoriesPage: AdminCategoriesPage

  test.beforeEach(async ({ admin }) => {
    categoriesPage = new AdminCategoriesPage(admin)
    await categoriesPage.goto()
  })

  test('should display categories list', async ({ admin }) => {
    await expect(admin.locator('[data-testid="page-title"]')).toContainText('Categorias')
    await expect(categoriesPage.categoriesList.first()).toBeVisible()
  })

  test('should add new category', async ({ admin: _admin }) => {
    await categoriesPage.addCategory('Bebidas Especiais', 'Descrição da categoria')
    const error = await categoriesPage.getError()
    expect(error).toBe('')
  })

  test('should edit existing category', async ({ admin: _admin }) => {
    await categoriesPage.editCategory('Bebidas', 'Bebidas Atualizadas')
    const error = await categoriesPage.getError()
    expect(error).toBe('')
  })

  test('should delete category', async ({ admin: _admin }) => {
    // First add a category to delete
    await categoriesPage.addCategory('Categoria para Deletar')
    await categoriesPage.deleteCategory('Categoria para Deletar')
  })

  test('should show error when adding category with duplicate name', async ({ admin: _admin }) => {
    await categoriesPage.addCategory('Bebidas')
    const error = await categoriesPage.getError()
    expect(error).toMatch(/duplicado|já existe/i)
  })

  test('should validate required fields', async ({ admin }) => {
    await categoriesPage.addCategory('')
    await expect(admin.locator('[data-testid="field-error"]')).toBeVisible()
  })

  test('should search categories', async ({ admin }) => {
    await admin.locator('[data-testid="search-input"]').fill('Bebidas')
    const count = await categoriesPage.getCategoriesCount()
    expect(count).toBeGreaterThanOrEqual(0)
    await expect(categoriesPage.categoriesList.filter({ hasText: 'Bebidas' })).toBeVisible()
  })

  test('should paginate categories list', async ({ admin }) => {
    const count = await categoriesPage.getCategoriesCount()
    expect(count).toBeGreaterThan(0)
    if (count > 10) {
      await admin.locator('[data-testid="next-page"]').click()
      await expect(admin.locator('[data-testid="page-number"]')).toContainText('2')
    }
  })
})
