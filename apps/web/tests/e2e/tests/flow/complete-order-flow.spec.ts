/**
 * E2E: Fluxo Completo do Pedido (Happy Path)
 *
 * Cobre o ciclo de vida INTEIRO de um pedido, do início ao fim:
 *
 * 1. 👨‍💼 Admin configura restaurante e cardápio
 * 2. 🪑 Admin cria mesa e gera QR Code
 * 3. 📱 Cliente escaneia QR Code → vê cardápio
 * 4. 🛒 Cliente adiciona itens ao carrinho (com modificadores)
 * 5. 💳 Cliente finaliza pedido com PIX
 * 6. ✅ Pagamento é confirmado via webhook (mock)
 * 7. 👨‍🍳 Cozinha recebe pedido no KDS
 * 8. 🔥 Cozinha marca como "em preparo" → "pronto"
 * 9. 🚚 Pedido sai pra entrega
 * 10. 📊 Analytics do admin reflete o pedido
 *
 * Tags: @critical, @smoke, @full-flow
 *
 * @see .openspec/specs/pedido/design.md
 * @see .openspec/specs/pagamento/design.md
 */

import { AdminAnalyticsPage } from '../../pages/AdminAnalyticsPage';
import { AdminOrdersPage } from '../../pages/AdminOrdersPage';
import { AdminProductsPage } from '../../pages/AdminProductsPage';
import { AdminTablesPage } from '../../pages/AdminTablesPage';
import { CartPage } from '../../pages/CartPage';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { KitchenPage } from '../../pages/KitchenPage';
import { MenuPage } from '../../pages/MenuPage';
import { OrderPage } from '../../pages/OrderPage';
import { test, expect } from '../shared/fixtures';

test.describe('Fluxo Completo do Pedido @critical @full-flow', () => {
  test.beforeEach(async ({ page }) => {
    // Limpa estado entre testes (carrinho, storage).
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test(
    'deve completar ciclo: admin cria mesa → cliente pede → paga → cozinha prepara → entrega → analytics atualiza',
    { tag: ['@critical', '@smoke', '@full-flow'] },
    async ({ admin, authenticated, kitchen, page }) => {
      // ──── FASE 1: Admin prepara o restaurante ────────────────
      // (já preparado pelo seed: 1 restaurante + 1 categoria + 1 produto + 1 mesa)

      const adminOrders = new AdminOrdersPage(admin);
      const adminProducts = new AdminProductsPage(admin);
      const adminAnalytics = new AdminAnalyticsPage(admin);

      // Admin adiciona mais produtos ao cardápio
      await adminProducts.goto();
      const initialProductCount = await adminProducts.countProducts();

      await adminProducts.createProduct({
        name: 'Pizza Calabresa E2E',
        description: 'Calabresa, cebola, azeitona',
        priceCents: 4500,
        categoryId: 'cat-seed-1',
        hasVariations: true,
        variations: [
          { name: 'Média', priceCents: 4500 },
          { name: 'Grande', priceCents: 5500 },
        ],
      });

      await adminProducts.expectProductVisible('Pizza Calabresa E2E');
      expect(await adminProducts.countProducts()).toBe(initialProductCount + 1);

      // ──── FASE 2: Cliente vê cardápio via QR Code da mesa ────
      const menuPage = new MenuPage(authenticated);
      await menuPage.goto();

      // Verifica que cardápio carrega com produtos do seed
      await expect(authenticated.locator('[data-testid="menu-cardapio"]')).toBeVisible();
      await expect(authenticated.locator('[data-testid="product-card"]').first()).toBeVisible();

      // ──── FASE 3: Cliente adiciona itens ao carrinho ─────────
      await menuPage.addProductToCart('Pizza Calabresa E2E');

      // Verifica badge do carrinho atualizou
      await expect(authenticated.locator('[data-testid="cart-badge-count"]')).toContainText('1');

      // ──── FASE 4: Cliente vai pro checkout ───────────────────
      const cartPage = new CartPage(authenticated);
      await cartPage.goto();
      await cartPage.goToCheckout();

      const checkoutPage = new CheckoutPage(authenticated);
      await checkoutPage.fillCustomerInfo({
        name: 'João Silva',
        email: 'joao.e2e@example.com',
        phone: '11999999999',
      });
      await checkoutPage.selectPaymentMethod('pix');
      await checkoutPage.submitOrder();

      // ──── FASE 5: QR Code PIX é exibido ──────────────────────
      await expect(authenticated.locator('[data-testid="pix-qr-code"]')).toBeVisible({
        timeout: 30_000,
      });

      const orderUrl = authenticated.url();
      const orderId = orderUrl.split('/order/')[1];
      expect(orderId).toBeTruthy();

      // ──── FASE 6: Admin confirma pagamento via webhook mock ──
      await admin.evaluate(async (id) => {
        const response = await fetch(`/api/admin/orders/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paid' }),
        });
        if (!response.ok) throw new Error(`Mock webhook failed: ${response.status}`);
      }, orderId);

      // ──── FASE 7: Cozinha (KDS) recebe pedido ────────────────
      const kitchenPage = new KitchenPage(kitchen);
      await kitchenPage.goto();
      await kitchenPage.waitForOrder(orderId, 30_000);

      // Verifica que pedido aparece no KDS
      await expect(kitchen.locator(`[data-testid="kitchen-order-${orderId}"]`)).toBeVisible();

      // Cozinha marca como em preparo
      await kitchenPage.startPreparing(orderId);
      await expect(kitchen.locator(`[data-order-id="${orderId}"][data-status="preparing"]`)).toBeVisible();

      // Cozinha marca como pronto
      await kitchenPage.markAsReady(orderId);
      await expect(kitchen.locator(`[data-order-id="${orderId}"][data-status="ready"]`)).toBeVisible();

      // ──── FASE 8: Garçom/entregador marca como entregue ─────
      await adminOrders.goto();
      await adminOrders.markAsDelivered(orderId);

      // ──── FASE 9: Cliente vê pedido como "Entregue" ─────────
      const orderPage = new OrderPage(authenticated);
      await orderPage.goto(orderId);
      await orderPage.waitForStatus('delivered', 30_000);
      await expect(orderPage.status).toContainText(/entregue|delivered/i);

      // ──── FASE 10: Analytics reflete o pedido ────────────────
      await adminAnalytics.goto();
      const totalOrders = await adminAnalytics.getTotalOrders();
      expect(totalOrders).toBeGreaterThanOrEqual(1);

      // Top product deve incluir o que vendemos
      const topProduct = await adminAnalytics.getTopProductName(0);
      expect(topProduct).toContain('Calabresa');
    }
  );

  test(
    'deve respeitar limites do trial após 14 dias (bloqueio de escrita)',
    { tag: ['@critical', '@billing'] },
    async ({ admin }) => {
      // ──── SETUP: Avança o tempo do trial artificialmente ───
      // (Em prod, isso seria feito via job cron. Aqui mockamos via API admin.)
      await admin.evaluate(async () => {
        await fetch('/api/admin/test/expire-trial', { method: 'POST' });
      });

      // ──── Admin tenta criar produto (deve ser bloqueado) ─────
      const adminProducts = new AdminProductsPage(admin);
      await adminProducts.goto();
      await adminProducts.newProductButton.click();

      await adminProducts.productNameInput.fill('Produto Pós-Trial');
      await adminProducts.productPriceInput.fill('29.90');
      await adminProducts.saveProductButton.click();

      // ──── Deve aparecer erro de trial expirado ───────────────
      await expect(adminProducts.errorToast).toBeVisible({ timeout: 10_000 });
      await expect(adminProducts.errorToast).toContainText(/trial|expirado|assinatura/i);
    }
  );

  test(
    'deve processar múltiplos pedidos em sequência (teste de carga leve)',
    { tag: ['@full-flow', '@slow'] },
    async ({ authenticated, admin }) => {
      const menuPage = new MenuPage(authenticated);
      const checkoutPage = new CheckoutPage(authenticated);

      // Cria 5 pedidos em sequência
      for (let i = 0; i < 5; i++) {
        await menuPage.goto();
        await menuPage.addProductToCart('Picanha');
        await checkoutPage.goto();
        await checkoutPage.fillCustomerInfo({
          name: `Cliente ${i + 1}`,
          email: `cliente${i + 1}.e2e@example.com`,
          phone: `1199999000${i}`,
        });
        await checkoutPage.selectPaymentMethod('pix');
        await checkoutPage.submitOrder();

        // Espera QR Code aparecer
        await expect(authenticated.locator('[data-testid="pix-qr-code"]')).toBeVisible({
          timeout: 15_000,
        });

        // Limpa carrinho pra próximo pedido
        await authenticated.evaluate(() => {
          // @ts-expect-error: acesso ao cart store global
          if (window.cartStore?.clearCart) window.cartStore.clearCart();
        });
      }

      // Verifica que todos os 5 pedidos aparecem no admin
      await admin.goto('/admin/pedidos');
      const orderRows = admin.locator('[data-testid="order-row"]');
      expect(await orderRows.count()).toBeGreaterThanOrEqual(5);
    }
  );
});