/**
 * Page Object: Admin Products (CRUD)
 *
 * Gerenciamento de produtos no painel admin:
 * - Listar produtos por categoria
 * - Criar produto (com variações e adicionais)
 * - Editar produto
 * - Desativar/excluir produto
 *
 * Uso:
 * ```ts
 * const products = new AdminProductsPage(page);
 * await products.goto();
 * await products.createProduct({
 *   name: 'Pizza Margherita',
 *   priceCents: 4500,
 *   categoryId: 'cat-1',
 * });
 * ```
 */

import type { Page, Locator } from '@playwright/test';

export interface CreateProductInput {
  name: string;
  description?: string;
  priceCents: number;
  categoryId: string;
  hasVariations?: boolean;
  variations?: { name: string; priceCents: number }[];
}

export class AdminProductsPage {
  readonly page: Page;
  readonly newProductButton: Locator;
  readonly productNameInput: Locator;
  readonly productDescriptionInput: Locator;
  readonly productPriceInput: Locator;
  readonly productCategorySelect: Locator;
  readonly saveProductButton: Locator;
  readonly productList: Locator;
  readonly productRows: Locator;
  readonly editProductButtons: Locator;
  readonly deleteProductButtons: Locator;
  readonly searchInput: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly variationsSection: Locator;
  readonly addVariationButton: Locator;
  readonly variationNameInputs: Locator;
  readonly variationPriceInputs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newProductButton = page.locator('[data-testid="new-product-button"]');
    this.productNameInput = page.locator('[data-testid="product-name"]');
    this.productDescriptionInput = page.locator('[data-testid="product-description"]');
    this.productPriceInput = page.locator('[data-testid="product-price"]');
    this.productCategorySelect = page.locator('[data-testid="product-category"]');
    this.saveProductButton = page.locator('[data-testid="save-product"]');
    this.productList = page.locator('[data-testid="products-list"]');
    this.productRows = page.locator('[data-testid="product-row"]');
    this.editProductButtons = page.locator('[data-testid="edit-product"]');
    this.deleteProductButtons = page.locator('[data-testid="delete-product"]');
    this.searchInput = page.locator('[data-testid="products-search"]');
    this.successToast = page.locator('[data-testid="success-toast"]');
    this.errorToast = page.locator('[data-testid="error-toast"]');
    this.variationsSection = page.locator('[data-testid="variations-section"]');
    this.addVariationButton = page.locator('[data-testid="add-variation"]');
    this.variationNameInputs = page.locator('[data-testid="variation-name"]');
    this.variationPriceInputs = page.locator('[data-testid="variation-price"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/produtos');
  }

  async createProduct(input: CreateProductInput): Promise<void> {
    await this.newProductButton.click();
    await this.productNameInput.fill(input.name);
    if (input.description) {
      await this.productDescriptionInput.fill(input.description);
    }
    await this.productPriceInput.fill((input.priceCents / 100).toFixed(2));
    await this.productCategorySelect.selectOption(input.categoryId);

    if (input.hasVariations && input.variations) {
      await this.variationsSection.waitFor({ state: 'visible' });
      for (let i = 0; i < input.variations.length; i++) {
        if (i > 0) await this.addVariationButton.click();
        await this.variationNameInputs.nth(i).fill(input.variations[i].name);
        await this.variationPriceInputs.nth(i).fill((input.variations[i].priceCents / 100).toFixed(2));
      }
    }

    await this.saveProductButton.click();
    await this.successToast.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async searchProduct(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // debounce
  }

  async clickProductByName(name: string): Promise<void> {
    await this.productRows.filter({ hasText: name }).first().click();
  }

  async deleteProduct(name: string): Promise<void> {
    const row = this.productRows.filter({ hasText: name }).first();
    await row.locator('[data-testid="delete-product"]').click();
    // Confirma modal de exclusão
    await this.page.locator('[data-testid="confirm-delete"]').click();
    await this.successToast.waitFor({ state: 'visible' });
  }

  async countProducts(): Promise<number> {
    return await this.productRows.count();
  }

  async expectProductVisible(name: string): Promise<void> {
    await this.productRows.filter({ hasText: name }).first().waitFor({ state: 'visible' });
  }
}