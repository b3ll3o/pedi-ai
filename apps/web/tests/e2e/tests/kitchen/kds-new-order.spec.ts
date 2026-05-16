import { test, expect } from '../shared/fixtures'

test.describe('Kitchen Display System (KDS)', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/kitchen')
  })

  test('deve exibir título Kitchen Display', async ({ adminPage }) => {
    await expect(adminPage.locator('h1')).toContainText('Kitchen Display')
  })

  test('deve exibir filtros de status', async ({ adminPage }) => {
    await expect(adminPage.locator('[data-testid="status-filter"]')).toBeVisible()
    await expect(adminPage.locator('[data-testid="status-all"]')).toBeVisible()
    await expect(adminPage.locator('[data-testid="status-received"]')).toBeVisible()
    await expect(adminPage.locator('[data-testid="status-preparing"]')).toBeVisible()
    await expect(adminPage.locator('[data-testid="status-ready"]')).toBeVisible()
  })

  test('deve exibir lista de pedidos', async ({ adminPage }) => {
    await expect(adminPage.locator('[data-testid="order-list"]')).toBeVisible()
  })

  test('deve exibir pedido com status "recebido" quando novo pedido é criado', async ({ adminPage }) => {
    await adminPage.goto('/kitchen')
    await expect(adminPage.locator('[data-testid="order-status-received"]').first()).toBeVisible()
  })

  test('deve mostrar indicador de conexão', async ({ adminPage }) => {
    await expect(adminPage.locator('[data-testid="connection-status"]')).toBeVisible()
  })

  test('deve ter controle de som', async ({ adminPage }) => {
    const soundToggle = adminPage.locator('[data-testid="sound-toggle"]')
    await expect(soundToggle).toBeVisible()
  })
})
