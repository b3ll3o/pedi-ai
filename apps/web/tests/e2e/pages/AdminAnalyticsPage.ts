/**
 * Page Object: Admin Analytics
 *
 * Dashboard de analytics do dono do restaurante:
 * - Faturamento (hoje, semana, mês)
 * - Pedidos por status
 * - Produtos mais vendidos
 * - Ticket médio
 * - Horários de pico
 *
 * Uso:
 * ```ts
 * const analytics = new AdminAnalyticsPage(page);
 * await analytics.goto();
 * const todayRevenue = await analytics.getTodayRevenue();
 * ```
 */

import type { Page, Locator } from '@playwright/test';

export class AdminAnalyticsPage {
  readonly page: Page;
  readonly todayRevenueCard: Locator;
  readonly weekRevenueCard: Locator;
  readonly monthRevenueCard: Locator;
  readonly totalOrdersCard: Locator;
  readonly avgTicketCard: Locator;
  readonly topProductsList: Locator;
  readonly ordersByStatusChart: Locator;
  readonly peakHoursChart: Locator;
  readonly dateRangeSelector: Locator;

  constructor(page: Page) {
    this.page = page;
    this.todayRevenueCard = page.locator('[data-testid="analytics-today-revenue"]');
    this.weekRevenueCard = page.locator('[data-testid="analytics-week-revenue"]');
    this.monthRevenueCard = page.locator('[data-testid="analytics-month-revenue"]');
    this.totalOrdersCard = page.locator('[data-testid="analytics-total-orders"]');
    this.avgTicketCard = page.locator('[data-testid="analytics-avg-ticket"]');
    this.topProductsList = page.locator('[data-testid="top-products-list"]');
    this.ordersByStatusChart = page.locator('[data-testid="orders-by-status-chart"]');
    this.peakHoursChart = page.locator('[data-testid="peak-hours-chart"]');
    this.dateRangeSelector = page.locator('[data-testid="date-range-selector"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/admin/analytics');
  }

  async getTodayRevenue(): Promise<number> {
    const text = (await this.todayRevenueCard.textContent()) ?? '';
    return this.parseCurrency(text);
  }

  async getMonthRevenue(): Promise<number> {
    const text = (await this.monthRevenueCard.textContent()) ?? '';
    return this.parseCurrency(text);
  }

  async getTotalOrders(): Promise<number> {
    const text = (await this.totalOrdersCard.textContent()) ?? '';
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : 0;
  }

  async getAvgTicket(): Promise<number> {
    const text = (await this.avgTicketCard.textContent()) ?? '';
    return this.parseCurrency(text);
  }

  async getTopProductName(index: number = 0): Promise<string> {
    const items = this.topProductsList.locator('[data-testid="top-product-item"]');
    return (await items.nth(index).textContent()) ?? '';
  }

  /**
   * Helper: converte "R$ 1.234,56" em 1234.56 (number).
   */
  private parseCurrency(text: string): number {
    const cleaned = text.replace(/[^\d,]/g, '').replace(',', '.');
    return Number(cleaned) || 0;
  }
}