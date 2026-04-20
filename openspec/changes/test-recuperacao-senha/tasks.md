# Tasks: Teste E2E de Recuperação de Senha

## Fase 1: Preparação

- [x] 1.1 Criar proposta formal (SDD proposal)
- [x] 1.2 Criar especificação delta (spec.md)
- [x] 1.3 Analisar UI existente de recuperação de senha

## Fase 2: Implementação

- [x] 2.1 Atualizar AdminLoginPage com locators de recuperação de senha
- [x] 2.2 Adicionar método `gotoResetPassword(token)` em AdminLoginPage
- [x] 2.3 Adicionar método `forgotPassword(email)` em AdminLoginPage
- [x] 2.4 Adicionar método `submitNewPassword(newPassword)` em AdminLoginPage
- [x] 2.5 Adicionar campo `resetToken` em SeedData.admin
- [x] 2.6 Adicionar teste E2E "should request password reset and login with new password"
- [x] 2.7 Adicionar teste E2E "should show error with non-existent email for password reset"

## Fase 3: Verificação

- [ ] 3.1 Executar testes unitários (`npm run test`)
- [ ] 3.2 Executar testes E2E localmente (`pnpm --filter @pedi-ai/e2e test:e2e`)
- [ ] 3.3 Verificar cobertura de testes (deve manter 80%+)
- [ ] 3.4 Validar que todos os testes passam

## Fase 4: CI/CD

- [ ] 4.1 Verificar que pipeline E2E passa no GitHub Actions
- [ ] 4.2 Verificar que coverage check passa