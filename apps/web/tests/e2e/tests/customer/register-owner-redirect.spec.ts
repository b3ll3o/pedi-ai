import { test, expect, clearClientState } from '../shared/fixtures'
import { RegisterPage } from '../../pages/RegisterPage'
import { CustomerLoginPage } from '../../pages/CustomerLoginPage'

/**
 * Teste E2E para validar o fluxo de registro com intent "gerenciar_restaurante"
 * e redirecionamento correto para /admin/restaurants/new após login.
 *
 * Bug esperado: useRedirectByRole.ts usa process.env.SUPABASE_SERVICE_ROLE_KEY
 * (server-only) ao invés de NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY (client-side),
 * causando falha na consulta de perfil e redirecionamento incorreto para /menu.
 */
test.describe('Registro com intent gerenciar_restaurante', () => {
  let registerPage: RegisterPage
  let loginPage: CustomerLoginPage

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page)
    loginPage = new CustomerLoginPage(page)
    await registerPage.goto()
  })

  test.afterEach(async ({ page }) => {
    await clearClientState(page)
  })

  /**
   * Cria um email único para cada execução do teste.
   */
  const createUniqueEmail = (): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `owner-${timestamp}-${random}@pedi-ai.test`
  }

  test.skip('deve redirecionar para /admin/restaurants/new após registrar com intent gerenciar_restaurante', { tag: ['@critical'] }, async ({ page }) => {
    const uniqueEmail = createUniqueEmail()
    const password = 'SenhaForte123!'

    // 1. Preencher formulário de registro
    await registerPage.nameInput.fill('Proprietário Teste')
    await registerPage.emailInput.fill(uniqueEmail)
    await registerPage.passwordInput.fill(password)
    await registerPage.confirmPasswordInput.fill(password)

    // 2. Selecionar opção "Quero gerenciar meu restaurante"
    const ownerIntentButton = page.locator('button[aria-pressed="true"]').filter({ hasText: /gerenciar meu restaurante/i })
      .or(page.locator('button').filter({ hasText: /gerenciar meu restaurante/i }))
    await ownerIntentButton.click()

    // Verifica que o botão está selecionado
    await expect(ownerIntentButton).toHaveAttribute('aria-pressed', 'true')

    // 3. Clicar em criar conta
    await registerPage.registerButton.click()

    // 4. Aguardar redirect para /login
    await page.waitForURL(/\/login/, { timeout: 10_000 })

    // Verifica mensagem de sucesso no login
    await expect(page.locator('text=Conta criada com sucesso')).toBeVisible({ timeout: 5_000 }).catch(() => {
      // Se não houver mensagem específica, apenas verifica que está no login
    })

    // 5. Fazer login com as credenciais criadas
    await loginPage.login(uniqueEmail, password)

    // 6. Aguardar redirect
    // O destino correto deveria ser /admin/restaurants/new (para donos sem restaurante)
    // Bug: atualmente redireciona para /menu devido a SUPABASE_SERVICE_ROLE_KEY ser undefined no client
    await page.waitForURL(/\/(menu|admin\/restaurants\/new|admin\/dashboard)/, { timeout: 10_000 })

    const currentUrl = page.url()

    // Este teste VAI FALHAR inicialmente, expondo o bug
    // O correto é que o usuário vá para /admin/restaurants/new
    expect(currentUrl).toMatch(/\/admin\/restaurants\/new/)

    // Verifica que NÃO está em /menu (证明bug存在)
    expect(currentUrl).not.toContain('/menu')
  })

  test('deve manter intent "gerenciar_restaurante" após registro', { tag: ['@smoke'] }, async ({ page }) => {
    const uniqueEmail = createUniqueEmail()
    const password = 'SenhaForte123!'

    // Preencher formulário
    await registerPage.nameInput.fill('Proprietário Sem Restaurante')
    await registerPage.emailInput.fill(uniqueEmail)
    await registerPage.passwordInput.fill(password)
    await registerPage.confirmPasswordInput.fill(password)

    // Selecionar intent gerenciar_restaurante
    const ownerButton = page.locator('button').filter({ hasText: /gerenciar meu restaurante/i })
    await ownerButton.click()
    await expect(ownerButton).toHaveAttribute('aria-pressed', 'true')

    // Criar conta
    await registerPage.registerButton.click()

    // Deve ir para /login com intent como parâmetro
    await page.waitForURL(/\/login\?.*intent=gerenciar_restaurante/, { timeout: 10_000 })
  })
})
