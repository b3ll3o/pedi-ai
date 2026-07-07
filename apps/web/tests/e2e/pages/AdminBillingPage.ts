/**
 * Page Object: Admin Billing / Subscription
 *
 * Gerenciamento da assinatura SaaS:
 * - Visualizar plano atual e trial restante
 * - Iniciar checkout (Asaas)
 * - Cancelar assinatura
 * - Histórico de pagamentos
 *
 * Uso:
 * ```ts
 * const billing = new AdminBillingPage(page);
 * await billing.goto();
 * await billing.startCheckout('monthly');
 * ```
 */

import type { Page, Locator } from '@playwright/test';

export type PlanType = 'monthly' | 'annual';

export class AdminBillingPage {
  readonly page: Page;
  readonly currentPlanCard: Locator;
  readonly trialDaysRemaining: Locator;
  readonly planMonthlyButton: Locator;
  readonly planAnnualButton: Locator;
  readonly checkoutButton: Locator;
  readonly cancelButton: Locator;
  readonly paymentHistory: Locator;
  readonly invoices: Locator;
  readonly statusBadge: Locator;
  readonly nextBillingDate: Locator;

  constructor(page: Page) {
    this.page = page;
    this.currentPlanCard = page.locator('[data-testid="current-plan-card"]');
    this.trialDaysRemaining = page.locator('[data-testid="trial-days-remaining"]');
    this.planMonthlyButton = page.locator('[data-testid="plan-monthly"]');
    this.planAnnualButton = page.locator('[data-testid="plan-annual"]');
    this.checkoutButton = page.locator('[data-testid="checkout-button"]');
    this.cancelButton = page.locator('[data-testid="cancel-subscription"]');
    this.paymentHistory = page.locator('[data-testid="payment-history"]');
    this.invoices = page.locator('[data-testid="invoice-row"]');
    this.statusBadge = page.locator('[data-testid="subscription-status"]');
    this.nextBillingDate = page.locator('[data-testid="next-billing-date"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/assinatura');
  }

  async selectPlan(plan: PlanType): Promise<void> {
    const button = plan === 'monthly' ? this.planMonthlyButton : this.planAnnualButton;
    await button.click();
  }

  async startCheckout(plan: PlanType): Promise<void> {
    await this.selectPlan(plan);
    await this.checkoutButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await this.page.locator('[data-testid="confirm-cancel"]').click();
    await this.statusBadge.waitFor({ state: 'visible' });
  }

  async getStatus(): Promise<string> {
    return (await this.statusBadge.textContent()) ?? '';
  }

  async getTrialDays(): Promise<number> {
    const text = (await this.trialDaysRemaining.textContent()) ?? '';
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }
}