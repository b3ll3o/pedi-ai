import { test, expect } from '../shared/fixtures'

/**
 * E2E Tests para Reativação de Restaurante
 *
 * Cenário: Reactivate disabled restaurant
 *   - GIVEN admin has disabled a restaurant
 *   - WHEN admin selects "Reativar" on the restaurant
 *   - THEN restaurant becomes active again
 *   - AND it appears in customer-facing menu
 */

const TEST_TIMESTAMP = Date.now()
const testRestaurant = {
  name: `Restaurante Reativar E2E ${TEST_TIMESTAMP}`,
  cnpj: '84.321.987/0001-22',
  address: 'Av. Reativar, 500 - São Paulo, SP',
  phone: '(11) 33333-4444',
}

test.describe('Admin Restaurant Reactivation', () => {
  test.describe.configure({ mode: 'serial' })

  let restaurantId: string

  // ============================================
  // Setup: Criar e desativar restaurante
  // ============================================
  test.describe('Setup: Criar e desativar restaurante', () => {
    test('deve criar restaurante para teste de reativação', async ({ admin }) => {
      await admin.goto('/admin/restaurants')
      await admin.waitForLoadState('networkidle')

      // Clicar em novo restaurante
      await admin.locator('text=Novo Restaurante').first().click()
      await expect(admin).toHaveURL(/\/admin\/restaurants\/new/)

      // Preencher formulário
      await admin.locator('[data-testid="restaurant-name-input"]').fill(testRestaurant.name)
      await admin.locator('[data-testid="restaurant-cnpj-input"]').fill(testRestaurant.cnpj)
      await admin.locator('[data-testid="restaurant-address-input"]').fill(testRestaurant.address)
      await admin.locator('[data-testid="restaurant-phone-input"]').fill(testRestaurant.phone)

      // Submeter
      await admin.locator('[data-testid="save-button"]').click()

      // Verificar redirect para lista
      await expect(admin).toHaveURL(/\/admin\/restaurants/)
      await admin.waitForLoadState('networkidle')

      // Encontrar o restaurante criado e obter ID da URL
      const restaurantCard = admin.locator('[data-testid="restaurant-card"]').filter({ hasText: testRestaurant.name })
      await expect(restaurantCard).toBeVisible()

      // Navegar para edição para obter o ID
      await restaurantCard.locator('text=Editar').click()
      await admin.waitForLoadState('networkidle')

      // Extrair ID da URL
      const url = admin.url()
      const match = url.match(/\/admin\/restaurants\/([^/]+)\/edit/)
      expect(match).toBeTruthy()
      restaurantId = match![1]

      // Verificar que o restaurante está ativo inicialmente
      const activeBadge = admin.locator('[role="status"]', { hasText: 'Ativo' })
      await expect(activeBadge).toBeVisible()
    })

    test('deve desativar restaurante via página de edição', async ({ admin }) => {
      // Navegar para a página de edição do restaurante
      await admin.goto(`/admin/restaurants/${restaurantId}/edit`)
      await admin.waitForLoadState('networkidle')

      // Verificar que o restaurante está visível
      await expect(admin.locator('h1')).toBeVisible()

      // Clicar no botão de desativar (Zona de Perigo)
      const deactivateButton = admin.locator('button', { hasText: 'Desativar Restaurante' })
      await expect(deactivateButton).toBeVisible()

      // Aceitar o confirm do browser
      admin.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('Tem certeza que deseja desativar')
        await dialog.accept()
      })

      await deactivateButton.click()

      // Aguardar redirect para lista de restaurantes
      await expect(admin).toHaveURL(/\/admin\/restaurants/)
      await admin.waitForLoadState('networkidle')

      // Verificar que o restaurante aparece como inativo na lista
      const restaurantCard = admin.locator('[data-testid="restaurant-card"]').filter({ hasText: testRestaurant.name })
      await expect(restaurantCard).toBeVisible()

      // Verificar badge Inativo
      const inactiveBadge = restaurantCard.locator('[role="status"]', { hasText: 'Inativo' })
      await expect(inactiveBadge).toBeVisible()
    })
  })

  // ============================================
  // Teste principal: Reativar restaurante
  // ============================================
  test.describe('Reativar restaurante desativado', () => {
    test('deve reativar restaurante quando admin seleciona "Reativar"', async ({ admin }) => {
      // Navegar para a página de edição do restaurante inativo
      await admin.goto(`/admin/restaurants/${restaurantId}/edit`)
      await admin.waitForLoadState('networkidle')

      // Verificar que o badge mostra Inativo
      const inactiveBadge = admin.locator('[role="status"]', { hasText: 'Inativo' })
      await expect(inactiveBadge).toBeVisible()

      // Encontrar e clicar no botão Reativar
      const reactivateButton = admin.locator('button', { hasText: 'Reativar' })
      await expect(reactivateButton).toBeVisible()

      await reactivateButton.click()

      // Aguardar que o estado seja atualizado
      await admin.waitForLoadState('networkidle')

      // Verificar que o badge agora mostra Ativo
      const activeBadge = admin.locator('[role="status"]', { hasText: 'Ativo' })
      await expect(activeBadge).toBeVisible()

      // Verificar que o botão mudou para Desativar (indicação de que está ativo)
      const deactivateButton = admin.locator('button', { hasText: 'Desativar Restaurante' })
      await expect(deactivateButton).toBeVisible()
    })

    test('deve aparecer no cardápio do cliente após reativação', async ({ guest }) => {
      // Navegar para a página do cardápio
      await guest.goto('/menu')
      await guest.waitForLoadState('networkidle')

      // O restaurante reativado deve aparecer no cardápio
      // (Assumindo que há um seletor de restaurante ou listagem de restaurantes)
      const restaurantOption = guest.locator('text=' + testRestaurant.name)
      await expect(restaurantOption.first()).toBeVisible()
    })

    test('deve reativar restaurante a partir da lista de restaurantes', async ({ admin }) => {
      // Navegar para lista de restaurantes
      await admin.goto('/admin/restaurants')
      await admin.waitForLoadState('networkidle')

      // Encontrar o restaurante inativo
      const restaurantCard = admin.locator('[data-testid="restaurant-card"]').filter({ hasText: testRestaurant.name })
      await expect(restaurantCard).toBeVisible()

      // Verificar badge Inativo
      const inactiveBadge = restaurantCard.locator('[role="status"]', { hasText: 'Inativo' })
      await expect(inactiveBadge).toBeVisible()

      // Clicar em Editar para ir para página de edição
      await restaurantCard.locator('text=Editar').click()
      await admin.waitForLoadState('networkidle')

      // Verificar estado Inativo na página de edição
      const inactiveBadgeOnPage = admin.locator('[role="status"]', { hasText: 'Inativo' })
      await expect(inactiveBadgeOnPage).toBeVisible()

      // Clicar em Reativar
      const reactivateButton = admin.locator('button', { hasText: 'Reativar' })
      await expect(reactivateButton).toBeVisible()
      await reactivateButton.click()

      // Aguardar atualização
      await admin.waitForLoadState('networkidle')

      // Verificar badge Ativo
      const activeBadgeOnPage = admin.locator('[role="status"]', { hasText: 'Ativo' })
      await expect(activeBadgeOnPage).toBeVisible()
    })
  })

  // ============================================
  // Cleanup
  // ============================================
  test.describe('Cleanup', () => {
    test('deve deletar restaurante de teste', async ({ admin }) => {
      await admin.goto(`/admin/restaurants/${restaurantId}/edit`)
      await admin.waitForLoadState('networkidle')

      // Aceitar confirm de exclusão se houver
      admin.on('dialog', async (dialog) => {
        await dialog.accept()
      })

      // Procurar botão de exclusão (se existir)
      const deleteButton = admin.locator('button', { hasText: /excluir|delete/i })
      if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await deleteButton.click()
        await admin.waitForLoadState('networkidle')
      }
    })
  })
})
