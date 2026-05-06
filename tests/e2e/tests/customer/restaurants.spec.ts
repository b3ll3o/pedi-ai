import { test, expect, clearClientState } from '../shared/fixtures'
import { RestaurantsPage, RestaurantMenuPage } from '../../pages/RestaurantsPage'

test.describe('Restaurants - Navegação Pública', () => {
  let restaurantsPage: RestaurantsPage
  let restaurantMenuPage: RestaurantMenuPage

  test.beforeEach(async ({ page }) => {
    restaurantsPage = new RestaurantsPage(page)
    restaurantMenuPage = new RestaurantMenuPage(page)
  })

  test.afterEach(async ({ page }) => {
    await clearClientState(page)
  })

  test('deve exibir página de restaurantes com lista de restaurantes', { tag: ['@smoke', '@critical'] }, async ({ seedData }) => {
    await restaurantsPage.goto()

    await expect(restaurantsPage.restaurantList).toBeVisible()
    await expect(restaurantsPage.searchInput).toBeVisible()

    await expect(restaurantsPage.restaurantCards.first()).toBeVisible()
  })

  test('deve carregar e exibir restaurantes do seed', { tag: '@critical' }, async ({ seedData }) => {
    await restaurantsPage.goto()
    await restaurantsPage.waitForList()

    const card = restaurantsPage.getCardByName(seedData.restaurant.name)
    await expect(card).toBeVisible()
  })

  test('deve navegar para cardápio ao clicar em restaurante', { tag: ['@smoke', '@critical'] }, async ({ seedData }) => {
    await restaurantsPage.goto()
    await restaurantsPage.waitForList()

    const card = restaurantsPage.getCardByName(seedData.restaurant.name)
    await card.click()

    await expect(restaurantsPage.page).toHaveURL(
      `/restaurantes/${seedData.restaurant.id}/cardapio`
    )
  })

  test('deve exibir página de cardápio com título', { tag: ['@smoke', '@critical'] }, async ({ seedData }) => {
    await restaurantMenuPage.goto(seedData.restaurant.id)
    await restaurantMenuPage.waitForMenu()

    await expect(restaurantMenuPage.pageTitle).toContainText('Cardápio')
  })

  test('deve filtrar restaurantes por nome na busca', { tag: '@critical' }, async ({ seedData }) => {
    await restaurantsPage.goto()
    await restaurantsPage.waitForList()

    await restaurantsPage.search('Restaurant E2E Test')

    await expect(
      restaurantsPage.getCardByName('Restaurant E2E Test')
    ).toBeVisible()
  })

  test('deve limpar busca e mostrar todos restaurantes', { tag: '@critical' }, async ({ seedData }) => {
    await restaurantsPage.goto()
    await restaurantsPage.waitForList()

    await restaurantsPage.search('NonExistentRestaurant')
    await expect(restaurantsPage.emptyState).toBeVisible()

    await restaurantsPage.clearSearch()
    await expect(
      restaurantsPage.getCardByName(seedData.restaurant.name)
    ).toBeVisible()
  })

  test('deve navegar entre restaurantes diferentes', { tag: '@critical' }, async ({ seedData }) => {
    await restaurantMenuPage.goto(seedData.restaurant.id)
    await restaurantMenuPage.waitForMenu()
    await expect(restaurantMenuPage.pageTitle).toContainText('Cardápio')

    await restaurantsPage.goto()
    await restaurantsPage.waitForList()

    await expect(
      restaurantsPage.getCardByName(seedData.restaurant.name)
    ).toBeVisible()
  })
})
