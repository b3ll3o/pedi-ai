# Proposal: Teste E2E de Recuperação de Senha

## Intent

Adicionar cobertura E2E para o fluxo de recuperação de senha no Pedi-AI, conforme exigido pelas regras de qualidade do projeto ("Fluxo de autenticação MUST incluir recuperação de senha").

## Scope

### In Scope
- Criar teste E2E em `tests/e2e/tests/admin/auth.spec.ts` para o fluxo de recuperação de senha
- Cobrir cenário: usuário acessa página de login → clica em "Esqueci a senha" → insere email → recebe link de reset → redefine senha → faz login com nova senha
- Atualizar Page Object `AdminLoginPage` com métodos para recuperação de senha

### Out of Scope
- Implementação do backend de recuperação de senha (já existe)
- Testes unitários de recuperação de senha (cobertura existente via service tests)
- Modificações na UI de autenticação

## Approach

1. **Análise**: Examinar UI existente de recuperação de senha e fluxos
2. **Page Object**: Adicionar métodos `forgotPassword()`, `resetPassword()` em `AdminLoginPage`
3. **Teste E2E**: Criar cenário completo com Playwright:
   - Given: usuário na página de login
   - When: clica em "Esqueci minha senha" e insere email válido
   - Then: sistema exibe confirmação de envio de email
   - And: usuário acessa link de reset (simulado via seedData)
   - And: redefine senha
   - And: faz login com nova senha com sucesso

## Affected Areas

| Arquivo | Mudança |
|---------|---------|
| `tests/e2e/pages/AdminLoginPage.ts` | Adicionar métodos de recuperação de senha |
| `tests/e2e/tests/admin/auth.spec.ts` | Adicionar cenário E2E de recuperação de senha |
| `tests/e2e/tests/shared/fixtures.ts` | Garantir que seedData inclua dados para reset |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| UI de reset muda durante implementação | Média | Baixo | Teste usa selectores resilientes (data-testid) |
| Token de reset expira | Baixa | Médio | Seed data fornece token válido |

## Rollback Plan

1. Remover os novos testes adicionados
2. Reverter modificações no Page Object se houver
3. CI/CD continua passando (testes são additive)

## Success Criteria

- [ ] Teste E2E de recuperação de senha criado e passando
- [ ] Teste cobre fluxo completo: solicitar reset → receber email → definir nova senha → login
- [ ] Todos os testes E2E passam localmente (`pnpm --filter @pedi-ai/e2e test:e2e`)
- [ ] Cobertura de testes unitários mantida em 80%+