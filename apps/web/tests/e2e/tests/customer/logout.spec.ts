import { test, expect, clearClientState } from '../shared/fixtures'
import { MenuPage } from '../../pages/MenuPage'

test.describe('Logout', () => {
  test.afterEach(async ({ page }) => {
    await clearClientState(page)
  })

  test.skip('deve realizar logout e redirecionar para login', { tag: ['@smoke', '@critical'] }, async ({ authenticated }) => {
    const menuPage = new MenuPage(authenticated)

    // Navegar para o menu (cliente já está logado via fixture)
    await menuPage.goto()
    await expect(authenticated).toHaveURL(/\/menu/)

    // Clicar no botão "Sair"
    await authenticated.click('[data-testid="customer-logout-button"]')

    // Verificar que URL muda para /login
    await expect(authenticated).toHaveURL(/\/login/)
  })

  test.skip('deve limpar sessão após logout', { tag: ['@smoke', '@critical'] }, async ({ authenticated }) => {
    const menuPage = new MenuPage(authenticated)

    // Navegar para o menu (cliente já está logado via fixture)
    await menuPage.goto()
    await expect(authenticated).toHaveURL(/\/menu/)

    // Clicar no botão "Sair"
    await authenticated.click('[data-testid="customer-logout-button"]')

    // Aguardar redirect completo para /login
    await expect(authenticated).toHaveURL(/\/login/)

    // Verificar que storage de autenticação foi limpo
    const hasAuthStorage = await authenticated.evaluate(() => {
      return Object.keys(localStorage).some(k => k.includes('supabase') || k.includes('auth'))
    })
    expect(hasAuthStorage).toBe(false)
  })
})
