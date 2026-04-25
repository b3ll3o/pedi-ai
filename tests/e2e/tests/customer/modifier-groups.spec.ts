import { test, expect } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'
import { CartPage } from '../../pages/CartPage'

test.describe('Modifier Groups', () => {
  let menuPage: MenuPage
  let cartPage: CartPage

  test.beforeEach(async ({ authenticated }) => {
    menuPage = new MenuPage(authenticated)
    cartPage = new CartPage(authenticated)
    // Ir para produto com modifier (Picanha)
    await menuPage.goto()
    await menuPage.selectCategory('Pratos Principais')
  })

  test.afterEach(async () => {
    // Limpar carrinho após cada teste
    await cartPage.goto()
    await cartPage.clearCart()
  })

  test('should not add product with required modifier without selection', async ({ authenticated }) => {
    // Tentar adicionar Picanha sem selecionar tamanho (required modifier)
    await menuPage.viewProduct('Picanha')

    // Botão de adicionar deve estar desabilitado ou mostrar erro ao clicar
    const addButton = authenticated.locator('[data-testid="add-to-cart-button"]')
    await addButton.click()

    // Deve aparecer mensagem de erro de validação
    await expect(authenticated.locator('[data-testid="modifier-error"], [data-testid="validation-error"]')).toBeVisible()
  })

  test('should add product with required modifier when selection is made', async ({ authenticated }) => {
    // Selecionar tamanho e adicionar
    await menuPage.viewProduct('Picanha')

    // Selecionar primeira opção de modifier (tamanho)
    const modifierOption = authenticated.locator('[data-testid^="modifier-option-"]').first()
    await modifierOption.click()

    // Agora o botão deve funcionar
    const addButton = authenticated.locator('[data-testid="add-to-cart-button"]')
    await addButton.click()

    // Verificar que foi adicionado ao carrinho
    await cartPage.goto()
    await expect(cartPage.cartItems.filter({ hasText: 'Picanha' })).toBeVisible()
  })

  test('should add product with optional modifier without selection', async ({ authenticated }) => {
    // Optional modifier não deve bloquear adição
    await menuPage.viewProduct('Picanha')

    // Não selecionar nenhum optional modifier
    const addButton = authenticated.locator('[data-testid="add-to-cart-button"]')

    // Se há required modifiers, selecionar um primeiro
    const requiredModifier = authenticated.locator('[data-testid^="modifier-option-"][data-required="true"]').first()
    if (await requiredModifier.count() > 0) {
      await requiredModifier.click()
    }

    await addButton.click()

    // Deve ter sido adicionado com sucesso
    await cartPage.goto()
    await expect(cartPage.cartItems.filter({ hasText: 'Picanha' })).toBeVisible()
  })

  test('should adjust price with optional modifier selection', async ({ authenticated }) => {
    // Selecionar optional modifier e verificar ajuste de preço
    await menuPage.viewProduct('Picanha')

    // Obter preço base
    const basePriceText = await authenticated.locator('[data-testid="product-price"]').textContent()
    const basePrice = parseFloat(basePriceText?.replace(/[^\d,]/g, '').replace(',', '.') ?? '0')

    // Selecionar required modifier primeiro
    const requiredModifier = authenticated.locator('[data-testid^="modifier-option-"][data-required="true"]').first()
    if (await requiredModifier.count() > 0) {
      await requiredModifier.click()
    }

    // Selecionar um optional modifier com adicional
    const optionalModifier = authenticated.locator('[data-testid^="modifier-option-"][data-required="false"]').first()
    if (await optionalModifier.count() > 0) {
      await optionalModifier.click()
    }

    // Verificar que o preço foi atualizado
    const updatedPriceText = await authenticated.locator('[data-testid="total-with-modifiers"]').textContent()
    const updatedPrice = parseFloat(updatedPriceText?.replace(/[^\d,]/g, '').replace(',', '.') ?? '0')

    // Preço deve ter sido ajustado (maior que base se há adicional)
    expect(updatedPrice).toBeGreaterThanOrEqual(basePrice)
  })

  test('should display selected modifiers in cart', async ({ authenticated }) => {
    // Selecionar modifiers e adicionar ao carrinho
    await menuPage.viewProduct('Picanha')

    // Selecionar required modifier
    const requiredModifier = authenticated.locator('[data-testid^="modifier-option-"][data-required="true"]').first()
    if (await requiredModifier.count() > 0) {
      await requiredModifier.click()
    }

    // Selecionar optional modifier
    const optionalModifier = authenticated.locator('[data-testid^="modifier-option-"][data-required="false"]').first()
    if (await optionalModifier.count() > 0) {
      await optionalModifier.click()
    }

    // Adicionar ao carrinho
    const addButton = authenticated.locator('[data-testid="add-to-cart-button"]')
    await addButton.click()

    // Ir para o carrinho e verificar modifiers
    await cartPage.goto()

    // Verificar que item aparece com modifiers
    const cartItem = cartPage.cartItems.filter({ hasText: 'Picanha' })
    await expect(cartItem).toBeVisible()

    // Verificar que modifiers aparecem no item do carrinho
    const modifiersSection = authenticated.locator('[data-testid="cart-item-modifiers"]')
    await expect(modifiersSection).toBeVisible()
  })
})
