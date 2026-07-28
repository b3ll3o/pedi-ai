/**
 * Kitchen Page Object
 *
 * Stub mínimo para satisfazer imports em testes E2E. Página da cozinha
 * (KDS - Kitchen Display System) usada pelo staff para gerenciar pedidos.
 *
 * @see apps/web/src/app/cozinha/ (rota original do KDS, se existir)
 */
import type { Page } from '@playwright/test';

export class KitchenPage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/cozinha');
  }

  async getOrderList(): Promise<string[]> {
    return [];
  }
}

export default KitchenPage;
