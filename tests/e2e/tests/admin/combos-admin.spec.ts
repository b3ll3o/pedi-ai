import { test, expect } from '../shared/fixtures'
import { AdminProductsPage } from '../../pages/AdminProductsPage'
import { createAdminClient, readSeedResult } from '../../support/api'

test.describe('Admin Combos', () => {
  let productsPage: AdminProductsPage
  let _seedData: ReturnType<typeof readSeedResult>

  test.beforeAll(async () => {
    // Carregar dados do seed
    _seedData = readSeedResult()
  })

  test.beforeEach(async ({ admin: _admin }) => {
    productsPage = new AdminProductsPage(admin)
    await productsPage.goto()
  })

  test('should display combos in products list with badge', async ({ admin: _admin }) => {
    // Verificar que combos aparecem com badge "Combo" na lista
    const comboCard = productsPage.productsList.filter({ hasText: 'Combo' }).first()
    await expect(comboCard).toBeVisible()
    await expect(comboCard.locator('[data-testid="product-badge"]')).toContainText('Combo')
  })

  test('should display bundle price instead of individual prices', async ({ admin }) => {
    // Acessar produto combo
    const comboCard = productsPage.productsList.filter({ hasText: 'Combo' }).first()
    await comboCard.locator('[data-testid="edit-button"]').click()

    // Verificar que campo bundle_price está visível
    const bundlePriceInput = admin.locator('[data-testid="bundle-price-input"]')
    await expect(bundlePriceInput).toBeVisible()

    // Verificar que preço bundle é exibido (não a soma dos itens)
    const bundlePrice = await bundlePriceInput.inputValue()
    expect(parseFloat(bundlePrice)).toBeGreaterThan(0)
  })

  test('should edit bundle price of existing combo', async ({ admin }) => {
    const adminClient = createAdminClient()

    // Encontrar um combo existente via API
    const { data: existingCombo } = await adminClient
      .from('products')
      .select('id, name, bundle_price')
      .eq('is_combo', true)
      .limit(1)
      .single()

    if (!existingCombo) {
      test.skip()
      return
    }

    const newBundlePrice = 29.99

    // Editar combo via API
    const { error: updateError } = await adminClient
      .from('products')
      .update({ bundle_price: newBundlePrice })
      .eq('id', existingCombo.id)

    expect(updateError).toBeNull()

    // Recarregar página e verificar atualização
    await admin.reload()

    const comboCard = productsPage.productsList.filter({ hasText: existingCombo.name }).first()
    await comboCard.locator('[data-testid="edit-button"]').click()

    const bundlePriceInput = admin.locator('[data-testid="bundle-price-input"]')
    await expect(bundlePriceInput).toHaveValue(newBundlePrice.toString())
  })

  test('should show combo items when expanded', async ({ admin }) => {
    const comboCard = productsPage.productsList.filter({ hasText: 'Combo' }).first()
    await comboCard.locator('[data-testid="expand-combo-button"]').click()

    // Verificar que itens do combo são exibidos
    const comboItems = admin.locator('[data-testid="combo-items-list"]')
    await expect(comboItems).toBeVisible()
    const itemCount = await comboItems.locator('[data-testid="combo-item"]').count()
    expect(itemCount).toBeGreaterThan(0)
  })

  test('should validate bundle price is numeric', async ({ admin }) => {
    const comboCard = productsPage.productsList.filter({ hasText: 'Combo' }).first()
    await comboCard.locator('[data-testid="edit-button"]').click()

    const bundlePriceInput = admin.locator('[data-testid="bundle-price-input"]')
    await bundlePriceInput.clear()
    await bundlePriceInput.fill('abc')

    await admin.locator('[data-testid="save-button"]').click()
    await expect(admin.locator('[data-testid="field-error"]')).toContainText('valor numérico')
  })

  test('should calculate savings compared to individual prices', async ({ admin: _admin }) => {
    const adminClient = createAdminClient()

    // Buscar combo com seus itens
    const { data: combo } = await adminClient
      .from('products')
      .select('id, name, bundle_price, product_combo_items(quantity, products(price))')
      .eq('is_combo', true)
      .limit(1)
      .single()

    if (!combo || !combo.bundle_price) {
      test.skip()
      return
    }

    // Calcular soma dos itens individuais
    const individualTotal = combo.product_combo_items?.reduce(
      (sum: number, item: { quantity: number; products: { price: number } }) =>
        sum + item.quantity * item.products.price,
      0
    ) ?? 0

    // Bundle deve ser mais barato
    expect(combo.bundle_price).toBeLessThan(individualTotal)

    const savings = individualTotal - combo.bundle_price
    expect(savings).toBeGreaterThan(0)
  })
})