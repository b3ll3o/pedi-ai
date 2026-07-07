/**
 * Page Object: Onboarding Wizard
 *
 * Wizard de 4 steps que guia o novo dono de restaurante a configurar
 * seu estabelecimento em ~5 minutos.
 *
 * Steps:
 * 1. Escolha da vertical (Pizzaria, Hamburgueria, Marmita, Japonesa, Lanchonete)
 * 2. Dados básicos (nome, CNPJ, endereço, telefone)
 * 3. Preview do template + confirmação
 * 4. Sucesso + link pro painel
 *
 * Uso:
 * ```ts
 * const onboarding = new OnboardingPage(page);
 * await onboarding.goto();
 * await onboarding.selectVertical('pizzaria');
 * await onboarding.clickNext();
 * // ... step 2, 3, 4
 * ```
 */

import type { Page, Locator } from '@playwright/test';

export type VerticalSlug = 'pizzaria' | 'hamburgueria' | 'marmita' | 'japonesa' | 'lanchonete';

export class OnboardingPage {
  readonly page: Page;
  readonly step1Container: Locator;
  readonly step2Container: Locator;
  readonly step3Container: Locator;
  readonly step4Container: Locator;
  readonly verticalCards: Locator;
  readonly restaurantNameInput: Locator;
  readonly cnpjInput: Locator;
  readonly addressInput: Locator;
  readonly phoneInput: Locator;
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly applyTemplateButton: Locator;
  readonly successMessage: Locator;
  readonly dashboardLink: Locator;
  readonly progressIndicators: Locator;

  constructor(page: Page) {
    this.page = page;
    this.step1Container = page.locator('[data-testid="onboarding-step-1"]');
    this.step2Container = page.locator('[data-testid="onboarding-step-2"]');
    this.step3Container = page.locator('[data-testid="onboarding-step-3"]');
    this.step4Container = page.locator('[data-testid="onboarding-step-4"]');
    this.verticalCards = page.locator('[data-testid="vertical-card"]');
    this.restaurantNameInput = page.locator('[data-testid="onboarding-restaurant-name"]');
    this.cnpjInput = page.locator('[data-testid="onboarding-cnpj"]');
    this.addressInput = page.locator('[data-testid="onboarding-address"]');
    this.phoneInput = page.locator('[data-testid="onboarding-phone"]');
    this.continueButton = page.locator('[data-testid="onboarding-continue"]');
    this.backButton = page.locator('[data-testid="onboarding-back"]');
    this.applyTemplateButton = page.locator('[data-testid="onboarding-apply-template"]');
    this.successMessage = page.locator('[data-testid="onboarding-success"]');
    this.dashboardLink = page.locator('[data-testid="onboarding-dashboard-link"]');
    this.progressIndicators = page.locator('[data-testid="onboarding-progress"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/onboarding');
  }

  /**
   * Step 1: seleciona a vertical.
   */
  async selectVertical(slug: VerticalSlug): Promise<void> {
    await this.verticalCards.filter({ has: this.page.locator(`[data-vertical-slug="${slug}"]`) }).click();
  }

  /**
   * Avança para o próximo step.
   */
  async clickNext(): Promise<void> {
    await this.continueButton.click();
  }

  /**
   * Volta para o step anterior.
   */
  async clickBack(): Promise<void> {
    await this.backButton.click();
  }

  /**
   * Step 2: preenche dados básicos.
   */
  async fillRestaurantData(data: {
    name: string;
    cnpj: string;
    address?: string;
    phone?: string;
  }): Promise<void> {
    await this.restaurantNameInput.fill(data.name);
    await this.cnpjInput.fill(data.cnpj);
    if (data.address) await this.addressInput.fill(data.address);
    if (data.phone) await this.phoneInput.fill(data.phone);
  }

  /**
   * Step 3: aplica o template de cardápio.
   */
  async applyTemplate(): Promise<void> {
    await this.applyTemplateButton.click();
  }

  /**
   * Step 4: vai pro painel após sucesso.
   */
  async goToDashboard(): Promise<void> {
    await this.dashboardLink.click();
  }

  /**
   * Helper: verifica que está num step específico.
   */
  async expectStep(step: 1 | 2 | 3 | 4): Promise<void> {
    const containers = {
      1: this.step1Container,
      2: this.step2Container,
      3: this.step3Container,
      4: this.step4Container,
    };
    await containers[step].waitFor({ state: 'visible', timeout: 10_000 });
  }
}