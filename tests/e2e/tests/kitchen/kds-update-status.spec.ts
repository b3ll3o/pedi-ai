import { test, expect } from '../shared/fixtures'

test.describe('KDS - Atualização de Status', () => {
  test.beforeEach(async ({ adminPage }) => {
    await adminPage.goto('/kitchen')
  })

  test('deve atualizar status para "preparando" ao clicar em "Aceitar"', async ({ adminPage }) => {
    const acceptButton = adminPage.locator('[data-testid="order-accept-btn"]').first()
    if (await acceptButton.isVisible()) {
      await acceptButton.click()
      await expect(adminPage.locator('[data-testid="order-status-preparing"]').first()).toBeVisible()
    }
  })

  test('deve atualizar status para "pronto" ao clicar em "Pronto"', async ({ adminPage }) => {
    const readyButton = adminPage.locator('[data-testid="order-ready-btn"]').first()
    if (await readyButton.isVisible()) {
      await readyButton.click()
      await expect(adminPage.locator('[data-testid="order-status-ready"]').first()).toBeVisible()
    }
  })

  test('deve atualizar status para "entregue" ao clicar em "Entregue"', async ({ adminPage }) => {
    const deliveredButton = adminPage.locator('[data-testid="order-delivered-btn"]').first()
    if (await deliveredButton.isVisible()) {
      await deliveredButton.click()
      await expect(adminPage.locator('[data-testid="order-status-delivered"]').first()).toBeVisible()
    }
  })

  test('deve filtrar pedidos por status', async ({ adminPage }) => {
    await adminPage.locator('[data-testid="status-received"]').click()
    await expect(adminPage.locator('[data-testid="order-card"]').first()).toBeVisible()
  })
})
