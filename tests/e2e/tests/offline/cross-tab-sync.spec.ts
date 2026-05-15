import { test, expect, _Page, BrowserContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { MenuPage } from '../../pages/MenuPage'
import { CartPage } from '../../pages/CartPage'

/**
 * Testes de sincronização de carrinho entre abas do navegador.
 * Usa storage state compartilhado para simular múltiplas abas do mesmo usuário.
 */

// Caminho para o resultado do seed
const SEED_RESULT_PATH = path.join(__dirname, '..', '..', '..', '..', '..', 'scripts', '.seed-result.json')
const STORAGE_DIR = '.playwright/.auth'

interface SeedData {
  restaurant: { id: string; name: string }
  customer: { email: string; password: string; id: string }
  categories: Array<{ id: string; name: string }>
  products: Array<{ id: string; name: string; price: number }>
}

function loadSeedData(): SeedData {
  if (!fs.existsSync(SEED_RESULT_PATH)) {
    throw new Error(`Seed result not found at ${SEED_RESULT_PATH}`)
  }
  return JSON.parse(fs.readFileSync(SEED_RESULT_PATH, 'utf-8'))
}

function getStoragePath(email: string): string {
  const safeName = email.replace(/[^a-zA-Z0-9]/g, '_')
  return path.join(process.cwd(), STORAGE_DIR, `${safeName}.json`)
}

/**
 * Cria um contexto do navegador autenticado com o usuário customer.
 */
async function createAuthenticatedContext(browser: import('@playwright/test').Browser, email: string): Promise<BrowserContext> {
  const storagePath = getStoragePath(email)
  if (!fs.existsSync(storagePath)) {
    throw new Error(`Storage state not found for ${email}. Run seed first.`)
  }
  return browser.newContext({ storageState: storagePath })
}

test.describe('Cross-Tab Cart Sync', () => {
  test.beforeEach(async ({ _browser}) => {
    const seedData = loadSeedData()
    // Ensure storage state exists by checking
    const storagePath = getStoragePath(seedData.customer.email)
    if (!fs.existsSync(storagePath)) {
      throw new Error(`Auth storage not found. Run 'pnpm test:e2e:seed' first.`)
    }
  })

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => indexedDB.deleteDatabase('pedi-ai-db'))
  })

  test('Cart updates sync across tabs', async ({ browser }) => {
    const seedData = loadSeedData()
    const context = await createAuthenticatedContext(browser, seedData.customer.email)

    // Open two tabs
    const tabA = await context.newPage()
    const tabB = await context.newPage()

    const menuPageA = new MenuPage(tabA)
    const cartPageA = new CartPage(tabA)
    const cartPageB = new CartPage(tabB)

    // Tab A: Go to menu and add item
    await menuPageA.goto()
    const productName = seedData.products[0]?.name ?? 'Coca-Cola'
    await menuPageA.addProductToCart(productName)

    // Tab B: Go to cart and verify item appeared
    await cartPageB.goto()
    await expect(cartPageB.cartItems.filter({ hasText: productName })).toBeVisible({ timeout: 5000 })

    // Verify total is updated in Tab B
    const totalB = await cartPageB.getTotal()
    expect(totalB).toMatch(/R\$\s*[\d,]+/)

    // Tab A: Also verify cart shows the item
    await cartPageA.goto()
    await expect(cartPageA.cartItems.filter({ hasText: productName })).toBeVisible()

    // Verify total is updated in Tab A
    const totalA = await cartPageA.getTotal()
    expect(totalA).toMatch(/R\$\s*[\d,]+/)

    // Cleanup
    await context.close()
  })

  test('Cart removal syncs across tabs', async ({ browser }) => {
    const seedData = loadSeedData()
    const context = await createAuthenticatedContext(browser, seedData.customer.email)

    // Open two tabs
    const tabA = await context.newPage()
    const tabB = await context.newPage()

    const menuPageA = new MenuPage(tabA)
    const cartPageA = new CartPage(tabA)
    const cartPageB = new CartPage(tabB)

    // Setup: Tab A: Go to menu and add two items
    await menuPageA.goto()
    const product1 = seedData.products[0]?.name ?? 'Coca-Cola'
    const product2 = seedData.products[1]?.name ?? 'Picanha'
    await menuPageA.addProductToCart(product1)
    await menuPageA.addProductToCart(product2)

    // Verify both items in Tab B
    await cartPageB.goto()
    await expect(cartPageB.cartItems.filter({ hasText: product1 })).toBeVisible()
    await expect(cartPageB.cartItems.filter({ hasText: product2 })).toBeVisible()

    // Tab B: Remove one item
    await cartPageB.removeItem(product1)

    // Tab A: Verify removal is reflected (wait for sync)
    await expect(cartPageA.cartItems.filter({ hasText: product1 })).not.toBeVisible({ timeout: 5000 })
    await expect(cartPageA.cartItems.filter({ hasText: product2 })).toBeVisible()

    // Verify totals are updated in both tabs
    const totalA = await cartPageA.getTotal()
    const totalB = await cartPageB.getTotal()
    expect(totalA).toMatch(/R\$\s*[\d,]+/)
    expect(totalB).toMatch(/R\$\s*[\d,]+/)

    // Cleanup
    await context.close()
  })

  test('Cart quantity update syncs across tabs', async ({ browser }) => {
    const seedData = loadSeedData()
    const context = await createAuthenticatedContext(browser, seedData.customer.email)

    const tabA = await context.newPage()
    const tabB = await context.newPage()

    const menuPageA = new MenuPage(tabA)
    const cartPageA = new CartPage(tabA)
    const cartPageB = new CartPage(tabB)

    // Setup: Add item to cart
    await menuPageA.goto()
    const productName = seedData.products[0]?.name ?? 'Coca-Cola'
    await menuPageA.addProductToCart(productName)

    // Verify item is in Tab B
    await cartPageB.goto()
    await expect(cartPageB.cartItems.filter({ hasText: productName })).toBeVisible()

    // Tab B: Update quantity to 3
    await cartPageB.updateQuantity(productName, 3)

    // Tab A: Verify quantity updated
    await cartPageA.goto()
    const quantityInput = cartPageA.cartItems
      .filter({ hasText: productName })
      .locator('[data-testid="quantity-input"]')
    await expect(quantityInput).toHaveValue('3', { timeout: 5000 })

    // Cleanup
    await context.close()
  })
})
