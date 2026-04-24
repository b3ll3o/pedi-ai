import { test, expect } from '../shared/fixtures'
import { RegisterPage } from '../../pages/RegisterPage'
import { CustomerLoginPage } from '../../pages/CustomerLoginPage'

test.describe('Registro do Cliente', () => {
  let registerPage: RegisterPage
  let loginPage: CustomerLoginPage

  test.beforeEach(async ({ page }) => {
    registerPage = new RegisterPage(page)
    loginPage = new CustomerLoginPage(page)
    await registerPage.goto()
  })

  test('deve exibir o formulário de registro', async ({ page: _page }) => {
    await expect(registerPage.nameInput).toBeVisible()
    await expect(registerPage.emailInput).toBeVisible()
    await expect(registerPage.passwordInput).toBeVisible()
    await expect(registerPage.confirmPasswordInput).toBeVisible()
    await expect(registerPage.registerButton).toBeVisible()
  })

  test('deve registrar novo cliente com credenciais válidas e redirecionar para login', { tag: ['@critical'] }, async ({ page }) => {
    const uniqueEmail = `novo-cliente-${Date.now()}@pedi-ai.test`
    await registerPage.register('Novo Cliente', uniqueEmail, 'SenhaForte123!', 'SenhaForte123!')
    await expect(page).toHaveURL('/login?registered=true')
  })

  test('deve fazer login com email recém-cadastrado e redirecionar para /menu', { tag: ['@critical'] }, async ({ page }) => {
    const uniqueEmail = `novo-cliente-login-${Date.now()}@pedi-ai.test`
    await registerPage.register('Novo Cliente', uniqueEmail, 'SenhaForte123!', 'SenhaForte123!')
    await expect(page).toHaveURL('/login?registered=true')
    await loginPage.login(uniqueEmail, 'SenhaForte123!')
    await expect(page).toHaveURL('/menu')
  })

  test('deve exibir erro com email já existente', { tag: ['@critical'] }, async ({ seedData }) => {
    await registerPage.register('Novo Cliente', seedData.customer.email, 'SenhaForte123!', 'SenhaForte123!')
    const error = await registerPage.getError()
    expect(error).toMatch(/email|já existe|duplicate|already (exists|registered)/i)
  })

  test('deve exibir erro com senhas que não coincidem', async ({ page: _page }) => {
    await registerPage.register('Novo Cliente', 'novo@test.com', 'SenhaForte123!', 'SenhaDiferente456!')
    const error = await registerPage.getError()
    expect(error).toMatch(/senha|não coincidem|match|different/i)
  })

  test('deve exibir erro com campos vazios', async ({ page }) => {
    await registerPage.register('', '', '', '')
    await expect(page.locator('[data-testid="field-error"]').first()).toBeVisible()
  })

  test('deve ter link para página de login', { tag: ['@smoke'] }, async ({ page: _page }) => {
    await expect(registerPage.loginLink).toBeVisible()
    await expect(registerPage.loginLink).toHaveAttribute('href', '/login')
  })

  test('deve navegar para /register ao clicar em "Começar Agora" na home', { tag: ['@smoke'] }, async ({ page }) => {
    await page.goto('/')
    const startButton = page.getByRole('link', { name: /começar agora/i })
    await startButton.click()
    await expect(page).toHaveURL('/register')
  })
})
