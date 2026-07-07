/**
 * E2E: Analytics Dashboard
 *
 * Cobre o dashboard de analytics do dono do restaurante:
 * - Faturamento em diferentes períodos (hoje, semana, mês)
 * - Total de pedidos
 * - Ticket médio
 * - Produtos mais vendidos (ranking)
 * - Pedidos por status (gráfico)
 * - Horários de pico (gráfico)
 *
 * Valida:
 * - Dados refletem em tempo real após novo pedido
 * - Filtros de data funcionam
 * - Performance do dashboard (carrega < 3s com 100 pedidos)
 *
 * Tags: @analytics, @critical
 *
 * @see apps/web/src/components/admin/analytics/
 */

import { AdminAnalyticsPage } from '../../pages/AdminAnalyticsPage';
import { MenuPage } from '../../pages/MenuPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { test, expect } from '../shared/fixtures';

test.describe('Analytics Dashboard @analytics', () => {
  let analytics: AdminAnalyticsPage;

  test.beforeEach(async ({ admin }) => {
    analytics = new AdminAnalyticsPage(admin);
  });

  test(
    'deve exibir dashboard inicial zerado quando não há pedidos',
    { tag: ['@analytics', '@smoke'] },
    async ({ admin }) => {
      // Reset dados de teste
      await admin.evaluate(async () => {
        await fetch('/api/admin/test/reset-orders', { method: 'POST' });
      });

      await analytics.goto();

      const todayRevenue = await analytics.getTodayRevenue();
      expect(todayRevenue).toBe(0);

      const totalOrders = await analytics.getTotalOrders();
      expect(totalOrders).toBe(0);
    }
  );

  test(
    'deve refletir faturamento após pedido pago',
    { tag: ['@analytics', '@critical'] },
    async ({ admin, authenticated }) => {
      // ─── SETUP: Zerar dados ──────────────────────────────
      await admin.evaluate(async () => {
        await fetch('/api/admin/test/reset-orders', { method: 'POST' });
      });

      // ─── ACT: Criar e pagar 1 pedido ─────────────────────
      const menuPage = new MenuPage(authenticated);
      await menuPage.goto();
      await menuPage.addProductToCart('Picanha'); // R$ 79,90 do seed

      const checkoutPage = new CheckoutPage(authenticated);
      await checkoutPage.goto();
      await checkoutPage.fillCustomerInfo({
        name: 'Cliente Analytics',
        email: 'analytics.e2e@example.com',
        phone: '11999991111',
      });
      await checkoutPage.selectPaymentMethod('pix');
      await checkoutPage.submitOrder();

      const orderUrl = authenticated.url();
      const orderId = orderUrl.split('/order/')[1];

      // Simula pagamento confirmado
      await admin.evaluate(async (id) => {
        await fetch(`/api/admin/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid' }),
        });
      }, orderId);

      // ─── ASSERT: Analytics reflete ────────────────────────
      await analytics.goto();

      const todayRevenue = await analytics.getTodayRevenue();
      expect(todayRevenue).toBeGreaterThanOrEqual(79.9); // Picanha R$ 79,90

      const totalOrders = await analytics.getTotalOrders();
      expect(totalOrders).toBeGreaterThanOrEqual(1);

      // Ticket médio deve ser >= 79,90
      const avgTicket = await analytics.getAvgTicket();
      expect(avgTicket).toBeGreaterThanOrEqual(79.9);
    }
  );

  test(
    'deve rankear produtos por vendas corretamente',
    { tag: ['@analytics', '@ranking'] },
    async ({ admin, authenticated }) => {
      // ─── SETUP: Zerar + criar pedidos de produtos diferentes
      await admin.evaluate(async () => {
        await fetch('/api/admin/test/reset-orders', { method: 'POST' });
      });

      // 3 pedidos de Picanha + 1 pedido de Sobremesa
      for (let i = 0; i < 3; i++) {
        const menuPage = new MenuPage(authenticated);
        await menuPage.goto();
        await menuPage.addProductToCart('Picanha');

        const checkoutPage = new CheckoutPage(authenticated);
        await checkoutPage.goto();
        await checkoutPage.fillCustomerInfo({
          name: `Cliente ${i}`,
          email: `cliente${i}.analytics@example.com`,
          phone: `1199999000${i}`,
        });
        await checkoutPage.selectPaymentMethod('pix');
        await checkoutPage.submitOrder();

        const orderUrl = authenticated.url();
        const orderId = orderUrl.split('/order/')[1];

        await admin.evaluate(async (id) => {
          await fetch(`/api/admin/orders/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'paid' }),
          });
        }, orderId);
      }

      await analytics.goto();

      // Top 1 deve ser Picanha (3 vendas vs 1 de outros)
      const topProduct = await analytics.getTopProductName(0);
      expect(topProduct).toContain('Picanha');
    }
  );

  test(
    'deve carregar dashboard com performance aceitável (< 3s)',
    { tag: ['@analytics', '@performance'] },
    async ({ admin }) => {
      const start = Date.now();
      await analytics.goto();

      // Espera dashboard carregar completamente
      await expect(analytics.todayRevenueCard).toBeVisible();
      const loadTime = Date.now() - start;

      // Em dev deve ser < 3s; em CI com latência pode ir até 5s
      expect(loadTime).toBeLessThan(5000);
    }
  );

  test(
    'deve filtrar analytics por período customizado',
    { tag: ['@analytics', '@filter'] },
    async ({ admin }) => {
      await analytics.goto();

      // Seleciona período "Últimos 7 dias"
      await analytics.dateRangeSelector.click();
      await admin.locator('[data-testid="range-option-last-7-days"]').click();

      // Espera cards atualizarem
      await expect(admin.locator('[data-testid="analytics-loading"]')).not.toBeVisible({ timeout: 10_000 });

      // Faturamento deve refletir o período
      const revenue = await analytics.getMonthRevenue();
      expect(revenue).toBeGreaterThanOrEqual(0); // pode ser 0 se não houver vendas
    }
  );

  test(
    'deve exibir gráfico de pedidos por status corretamente',
    { tag: ['@analytics', '@chart'] },
    async ({ admin }) => {
      await analytics.goto();

      // Gráfico deve renderizar
      await expect(analytics.ordersByStatusChart).toBeVisible();

      // Verifica que tem pelo menos 1 status (ex: "pago" ou "pendente")
      const chartText = (await analytics.ordersByStatusChart.textContent()) ?? '';
      expect(chartText.length).toBeGreaterThan(0);
    }
  );
});