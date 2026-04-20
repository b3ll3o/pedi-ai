# Delta: e2e-readme

## MODIFIED Requirements

### Requirement: Cobertura de recuperação de senha no README E2E
O README `tests/e2e/README.md` deve refletir corretamente a cobertura de testes de recuperação de senha para cliente e admin.

#### Scenario: Recuperação de senha cliente está coberta
- GIVEN o arquivo `tests/e2e/tests/customer/auth.spec.ts`
- WHEN inspected
- THEN o teste "deve solicitar recuperação de senha" está presente e funcional

#### Scenario: Recuperação de senha admin está coberta
- GIVEN o arquivo `tests/e2e/tests/admin/auth.spec.ts`
- WHEN inspected
- THEN o teste "should request password reset and login with new password" está presente e funcional

### Requirement: Contagem de Page Objects correta
O README deve informar 11 Page Objects, não 10.

#### Scenario: Page Objects count
- GIVEN a seção "Page Objects" do README
- WHEN verificada
- THEN lista 11 Page Objects: CustomerLoginPage, CartPage, CheckoutPage, OrderPage, MenuPage, AdminLoginPage, AdminDashboardPage, AdminCategoriesPage, AdminProductsPage, AdminOrdersPage, TableQRPage, WaiterDashboardPage

### Requirement: Tabela de cobertura de fluxos atualizada
A seção "Fluxos Sem Cobertura" deve refletir que recuperação de senha está coberta.

#### Scenario: Fluxos sem cobertura atualizados
- GIVEN a seção "Fluxos Sem Cobertura"
- WHEN visualizada
- THEN "Recuperação de senha (cliente)" e "Recuperação de senha (admin)" NÃO aparecem como fluxos sem cobertura