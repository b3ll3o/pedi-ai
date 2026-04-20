# Design: Teste E2E de Recuperação de Senha

## Visão Geral

Implementar cobertura E2E para o fluxo de recuperação de senha conforme especificado em `openspec/specs/auth/spec.md` (requisito "Password Reset").

## Decisões de Arquitetura

### 1. Page Object Pattern
Utilizado o padrão Page Object para isolar os locators e métodos de interação com a página de login, seguindo a estrutura existente do projeto.

**Alternativa considerada**: Interação direta nos testes via `page.locator()`.
**Decisão**: Usar Page Object porque mantém consistência com o padrão existente e facilita manutenção.

### 2. Localizadores (data-testid)
Todos os localizadores usam atributos `data-testid` para maior resilência a mudanças de UI.

| Elemento | data-testid |
|----------|-------------|
| Link "Esqueci minha senha" | `forgot-password-link` |
| Input de email para reset | `forgot-password-email` |
| Botão enviar reset | `forgot-password-submit` |
| Mensagem de sucesso reset | `forgot-password-success` |
| Input nova senha | `new-password-input` |
| Input confirmar senha | `confirm-password-input` |
| Botão redefinir senha | `reset-password-button` |
| Mensagem sucesso redefinição | `reset-success-message` |

### 3. Seed Data para Reset
Adicionado campo `resetToken` em `SeedData.admin` para permitir testes de fluxo completo de reset.

## Arquivos Alterados

| Arquivo | Mudança |
|---------|---------|
| `tests/e2e/pages/AdminLoginPage.ts` | +8 locators, +3 métodos |
| `tests/e2e/tests/shared/helpers/api.ts` | +1 campo em interface, +1 campo em createTestData |
| `tests/e2e/tests/admin/auth.spec.ts` | +2 testes |

## Fluxo de Teste

```
Teste: should request password reset and login with new password
─────────────────────────────────────────────────────────────
1. goto('/admin/login')
2. forgotPassword(seedData.admin.email)
3. expect(forgotPasswordSuccessMessage).toBeVisible()
4. gotoResetPassword(seedData.admin.resetToken)
5. submitNewPassword('NovaSenha123!')
6. expect(resetSuccessMessage).toBeVisible()
7. login(seedData.admin.email, 'NovaSenha123!')
8. expect(page).toHaveURL('/admin/dashboard')
```

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Token de reset expira | Seed data gera token válido |
| UI de reset muda | Uso de data-testid resiliente |