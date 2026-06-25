import { test, expect } from '../shared/fixtures';

test.describe('KDS - Atualização de Status', () => {
  test.beforeEach(async ({ admin }) => {
    await admin.goto('/kitchen');
  });

  test('deve atualizar status para "preparando" ao clicar em "Aceitar"', async ({ admin }) => {
    const acceptButton = admin.locator('[data-testid="order-accept-btn"]').first();
    if (await acceptButton.isVisible()) {
      await acceptButton.click();
      await expect(admin.locator('[data-testid="order-status-preparing"]').first()).toBeVisible();
    }
  });

  test('deve atualizar status para "pronto" ao clicar em "Pronto"', async ({ admin }) => {
    const readyButton = admin.locator('[data-testid="order-ready-btn"]').first();
    if (await readyButton.isVisible()) {
      await readyButton.click();
      await expect(admin.locator('[data-testid="order-status-ready"]').first()).toBeVisible();
    }
  });

  test('deve atualizar status para "entregue" ao clicar em "Entregue"', async ({ admin }) => {
    const deliveredButton = admin.locator('[data-testid="order-delivered-btn"]').first();
    if (await deliveredButton.isVisible()) {
      await deliveredButton.click();
      await expect(admin.locator('[data-testid="order-status-delivered"]').first()).toBeVisible();
    }
  });

  test('deve filtrar pedidos por status', async ({ admin }) => {
    await admin.locator('[data-testid="status-received"]').click();
    await expect(admin.locator('[data-testid="order-card"]').first()).toBeVisible();
  });
});
