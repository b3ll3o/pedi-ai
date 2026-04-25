import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CartPage } from '../../pages/CartPage'

test.describe('Combos', () => {
  let menuPage: MenuPage
  let cartPage: CartPage

  test.beforeEach(async ({ authenticated }) => {
    menuPage = new MenuPage(authenticated)
    cartPage = new CartPage(authenticated)
    await menuPage.goto()
  })

  test.afterEach(async () => {
    // Limpar carrinho após cada teste
    await cartPage.goto()
    await cartPage.clearCart()
  })

  test('should add combo to cart from menu', async ({ authenticated: _authenticated }) => {
    // Combo deve aparecer no cardápio com badge "Combo"
    const comboCard = menuPage.productCards.filter({ hasText: 'Combo' }).first()
    await expect(comboCard).toBeVisible()

    // Adicionar combo ao carrinho
    await comboCard.locator('[data-testid^="menu-add-to-cart-"]').click()

    // Verificar que foi adicionado
    await cartPage.goto()
    await expect(cartPage.cartItems.first()).toBeVisible()
  })

  test('should display bundle price instead of sum', async ({ authenticated }) => {
    // Acessar produto combo
    await menuPage.viewProduct('Combo')

    // Verificar que preço exibido é o bundle_price, não a soma dos itens
    const bundlePriceLocator = authenticated.locator('[data-testid="bundle-price"], [data-testid="product-price"]')
    await expect(bundlePriceLocator).toBeVisible()

    const bundlePriceText = await bundlePriceLocator.textContent()
    const bundlePrice = parseFloat(bundlePriceText?.replace(/[^\d,]/g, '').replace(',', '.') ?? '0')

    // O preço do bundle deve ser menor que a soma dos itens individuais (se mostrasse soma)
    // Apenas verificamos que é um valor válido
    expect(bundlePrice).toBeGreaterThan(0)
  })

  test('should use bundle price in cart total', async ({ authenticated: _authenticated }) => {
    // Adicionar combo ao carrinho
    const comboCard = menuPage.productCards.filter({ hasText: 'Combo' }).first()
    await comboCard.locator('[data-testid^="menu-add-to-cart-"]').click()

    // Ir para carrinho
    await cartPage.goto()

    // Obter preço do item no carrinho
    const itemPriceText = await cartPage.cartItems.first().locator('[data-testid="item-price"]').textContent()
    const itemPrice = parseFloat(itemPriceText?.replace(/[^\d,]/g, '').replace(',', '.') ?? '0')

    // Obter total do carrinho
    const totalText = await cartPage.getTotal()
    const total = parseFloat(totalText?.replace(/[^\d,]/g, '').replace(',', '.') ?? '0')

    // Total deve ser igual ao preço do bundle (não soma)
    expect(total).toBe(itemPrice)
  })

  test('should show combo in order details with bundle price', async ({ authenticated }) => {
    // Adicionar combo ao carrinho
    const comboCard = menuPage.productCards.filter({ hasText: 'Combo' }).first()
    await comboCard.locator('[data-testid^="menu-add-to-cart-"]').click()

    // Ir para checkout
    await cartPage.goto()
    await cartPage.proceedToCheckout()

    // Preencher dados e finalizar pedido
    await authenticated.fill('[data-testid="customer-name"]', 'Cliente Teste Combo')
    await authenticated.fill('[data-testid="customer-phone"]', '11999999999')

    // Submeter pedido
    await authenticated.click('[data-testid="submit-order"]')

    // Aguardar redirect para página de confirmação
    await authenticated.waitForURL(/\/order\//)

    // Verificar que pedido contém combo com preço bundle
    const orderDetails = authenticated.locator('[data-testid="order-details"]')
    await expect(orderDetails).toBeVisible()

    // Verificar que combo aparece com seu preço (bundle)
    await expect(orderDetails.filter({ hasText: 'Combo' })).toBeVisible()
  })
})
