import { test, expect } from '../shared/fixtures'
import { CustomerLoginPage } from '../../pages/CustomerLoginPage'

test.describe('Autenticação do Cliente', () => {
  let loginPage: CustomerLoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new CustomerLoginPage(page)
    await loginPage.goto()
  })

  test('deve exibir o formulário de login', async ({ page }) => {
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.loginButton).toBeVisible()
  })

  test('deve logar com credenciais válidas de cliente', async ({ page, seedData }) => {
    await loginPage.login(seedData.customer.email, seedData.customer.password)
    await loginPage.waitForMenu()
    await expect(page).toHaveURL('/menu')
  })

  test('deve exibir erro com credenciais inválidas', async ({ page }) => {
    await loginPage.login('invalid@test.com', 'wrongpassword')
    const error = await loginPage.getError()
    expect(error).toMatch(/inválido|incorreto|não encontrado/i)
  })

  test('deve exibir erro com campos vazios', async ({ page }) => {
    await loginPage.login('', '')
    await expect(page.locator('[data-testid="field-error"]').first()).toBeVisible()
  })

  test('deve fazer logout e redirecionar para login', async ({ authenticated }) => {
    await authenticated.locator('[data-testid="logout-button"]').click()
    await expect(authenticated).toHaveURL('/login')
  })

  test('deve redirecionar para login ao acessar rota protegida', async ({ page }) => {
    await page.goto('/menu')
    await expect(page).toHaveURL(/\/login/)
  })

  test('deve lembrar sessão do cliente', async ({ authenticated }) => {
    // Cliente deve permanecer logado após recarregar a página
    await authenticated.reload()
    await expect(authenticated).toHaveURL('/menu')
  })

  test('deve solicitar recuperação de senha', async ({ page, seedData }) => {
    await loginPage.forgotPassword(seedData.customer.email)
    await expect(loginPage.forgotPasswordSuccessMessage).toBeVisible()
  })

  test('deve exibir erro com email inexistente na recuperação de senha', async ({ page }) => {
    await loginPage.forgotPassword('nonexistent@test.com')
    const error = await loginPage.getError()
    expect(error).toMatch(/não encontrado|inválido/i)
  })
})