import { Page, Locator } from '@playwright/test'

export class RestaurantsPage {
  readonly page: Page
  readonly restaurantList: Locator
  readonly restaurantCards: Locator
  readonly searchInput: Locator
  readonly loadingSkeleton: Locator
  readonly emptyState: Locator

  constructor(page: Page) {
    this.page = page
    this.restaurantList = page.locator('[data-testid="restaurant-list"]')
    this.restaurantCards = page.locator('[data-testid^="restaurant-card-"]')
    this.searchInput = page.locator('[data-testid="restaurant-search-input"]')
    this.loadingSkeleton = page.locator('[data-testid="restaurant-list"] [class*="skeleton"]')
    this.emptyState = page.locator('[data-testid="restaurant-list-empty"]')
  }

  async goto(): Promise<void> {
    await this.page.goto('/restaurantes', { waitUntil: 'load' })
  }

  async waitForList(): Promise<void> {
    await this.restaurantList.waitFor({ state: 'visible', timeout: 10_000 })
  }

  async waitForLoading(): Promise<void> {
    await this.loadingSkeleton.first().waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {
      // Loading might be too fast, ignore
    })
  }

  getRestaurantCard(restaurantId: string): Locator {
    return this.page.locator(`[data-testid="restaurant-card-${restaurantId}"]`)
  }

  async clickRestaurant(restaurantId: string): Promise<void> {
    const card = this.getRestaurantCard(restaurantId)
    await card.click()
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    await this.page.waitForTimeout(400)
  }

  async clearSearch(): Promise<void> {
    await this.searchInput.clear()
    await this.page.waitForTimeout(400)
  }

  async getRestaurantName(restaurantId: string): Promise<string> {
    const card = this.getRestaurantCard(restaurantId)
    return card.locator('h3').textContent() ?? ''
  }

  getCardByName(name: string): Locator {
    return this.restaurantCards.filter({ hasText: name })
  }
}

export class RestaurantMenuPage {
  readonly page: Page
  readonly pageTitle: Locator
  readonly searchInput: Locator
  readonly categoriesContainer: Locator
  readonly categorySkeletons: Locator

  constructor(page: Page) {
    this.page = page
    this.pageTitle = page.locator('[data-testid="page-title"]')
    this.searchInput = page.locator('[data-testid="search-input"]')
    this.categoriesContainer = page.locator('[data-testid="menu-categories"]')
    this.categorySkeletons = page.locator('[data-testid="menu-categories"] [class*="skeleton"]')
  }

  async goto(restaurantId: string): Promise<void> {
    await this.page.goto(`/restaurantes/${restaurantId}/cardapio`, { waitUntil: 'load' })
  }

  async waitForMenu(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForFunction(() => {
      const title = document.querySelector('[data-testid="page-title"]')
      return title && title.textContent === 'Cardápio'
    }, { timeout: 15_000 })
  }

  async waitForCategories(): Promise<void> {
    await this.categoriesContainer.waitFor({ state: 'visible', timeout: 10_000 })
  }

  getCategoryByName(name: string): Locator {
    return this.categoriesContainer.locator('text=' + name)
  }

  async getProductCard(productName: string): Promise<Locator> {
    return this.page.locator('[data-testid^="menu-product-card-"]', { hasText: productName })
  }

  async addProductToCart(productName: string): Promise<void> {
    const productCard = await this.getProductCard(productName)
    const addButton = productCard.locator('[data-testid^="menu-add-to-cart-"]')
    await addButton.scrollIntoViewIfNeeded()
    await addButton.click()
  }
}
