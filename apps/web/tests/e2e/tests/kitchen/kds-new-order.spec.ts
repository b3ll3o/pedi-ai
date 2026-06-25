import { test, expect } from '../shared/fixtures';

test.describe('Kitchen Display System (KDS)', () => {
  test.beforeEach(async ({ admin }) => {
    await admin.goto('/kitchen');
  });

  test('deve exibir título Kitchen Display', async ({ admin }) => {
    await expect(admin.locator('h1')).toContainText('Kitchen Display');
  });

  test('deve exibir filtros de status', async ({ admin }) => {
    await expect(admin.locator('[data-testid="status-filter"]')).toBeVisible();
    await expect(admin.locator('[data-testid="status-all"]')).toBeVisible();
    await expect(admin.locator('[data-testid="status-received"]')).toBeVisible();
    await expect(admin.locator('[data-testid="status-preparing"]')).toBeVisible();
    await expect(admin.locator('[data-testid="status-ready"]')).toBeVisible();
  });

  test('deve exibir lista de pedidos', async ({ admin }) => {
    await expect(admin.locator('[data-testid="order-list"]')).toBeVisible();
  });

  test('deve exibir pedido com status "recebido" quando novo pedido é criado', async ({
    admin,
  }) => {
    await admin.goto('/kitchen');
    await expect(admin.locator('[data-testid="order-status-received"]').first()).toBeVisible();
  });

  test('deve mostrar indicador de conexão', async ({ admin }) => {
    await expect(admin.locator('[data-testid="connection-status"]')).toBeVisible();
  });

  test('deve ter controle de som', async ({ admin }) => {
    const soundToggle = admin.locator('[data-testid="sound-toggle"]');
    await expect(soundToggle).toBeVisible();
  });
});
