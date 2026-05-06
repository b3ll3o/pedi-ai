# Proposal: Fluxo Completo de Redefinição de Senha

## Intent

Implementar o fluxo completo de redefinição de senha para que usuários que esquecem suas senhas possam redefini-las através de um link enviado por email. Currently, o email de redefinição é enviado corretamente pelo Supabase Auth, mas quando o usuário clica no link, não existe uma página para processar o token e definir uma nova senha, resultando em redirecionamento para "/" (raiz).

Este change.addresses a lacuna entre o envio do email e a definição efetiva de uma nova senha, completando o fluxo de "esqueci minha senha".

## Scope

### In Scope

1. **Página de redefinição de senha para clientes** (`/reset-password`)
   - Renderizar formulário com campos para nova senha e confirmação
   - Extrair token de recovery da URL (`?token=xxx&type=recovery`)
   - Validar token com Supabase Auth
   - Atualizar senha via `supabase.auth.updateUser()`
   - Exibir mensagens de sucesso/erro apropriadas
   - Redirecionar para `/login` após sucesso

2. **Página de redefinição de senha para admins** (`/admin/reset-password`)
   - Mesma funcionalidade da página cliente
   - UI com estilo admin (diferentes cores/layout se necessário)

3. **API Route para atualização de senha** (`/api/auth/reset-password`)
   - Validar token server-side
   - Atualizar senha via Supabase Admin API
   - Retornar JSON com status de sucesso/erro

4. **Atualização da função `resetPassword`** em `src/lib/supabase/auth.ts`
   - Adicionar parâmetro `redirectTo` para especificar URL de callback
   - Passar redirectTo correto para `supabase.auth.resetPasswordForEmail()`

5. **Atualização do template de email de reset password**
   - Garantir que ConfirmationURL aponte para página correta (atualmente usa localhost:3000)

6. **Testes E2E**
   - Cenário completo: esqueci senha → recebe email → redefine senha → login com nova senha

### Out of Scope

- Implementação de força de senha (já existe validação no frontend)
- Envio de email (já existe via Supabase Auth)
- Recuperação de senha via SMS (apenas email)
- Migração de código legacy para DDD (fica para change separado)

## Approach

### Fluxo Proposto

```
1. Usuário acessa /login
2. Clica em "Esqueci minha senha"
3. Insere email → sistema chama resetPassword(email)
4. Supabase envia email com link: {site_url}/reset-password?token=xxx
5. Usuário recebe email, clica no link
6. Página /reset-password extrai token da URL
7. Usuário insere nova senha
8. Sistema chama API /api/auth/reset-password com { token, novaSenha }
9. API valida token e atualiza senha
10. Sistema redireciona para /login com mensagem de sucesso
11. Usuário faz login com nova senha
```

### Decisões de Arquitetura

| Decisão | Rationale |
|---------|-----------|
| Token via URL query param | Supabase Auth envia token assim (padrão) |
| Validação server-side no API route | Token expõe credenciais, não confiar no client |
| Redirecionar para /login após sucesso |用户体验: usuário deve fazer login com nova senha |
| Páginas separadas para cliente/admin | Admin pode ter UI diferente, mas mesmo fluxo |

### Tecnologias/Dependências

- **Supabase Auth**: `supabase.auth.resetPasswordForEmail()` e `supabase.auth.updateUser()`
- **API Routes Next.js**: `/api/auth/reset-password/route.ts`
- **React Hook Form** (se já existir no projeto) ou useState nativo

## Affected Areas

| Arquivo/Diretório | Mudança |
|-------------------|---------|
| `src/lib/supabase/auth.ts` | Adicionar `redirectTo` em `resetPassword()` |
| `src/app/reset-password/page.tsx` | **NOVO** - Página cliente |
| `src/app/admin/reset-password/page.tsx` | **NOVO** - Página admin |
| `src/app/api/auth/reset-password/route.ts` | **NOVO** - API route |
| `src/templates/email/reset-password.html` | Atualizar ConfirmationURL domain |
| `tests/e2e/tests/auth/reset-password.spec.ts` | **NOVO** - Testes E2E |
| `tests/e2e/pages/CustomerResetPasswordPage.ts` | **NOVO** - Page Object |
| `tests/e2e/pages/AdminResetPasswordPage.ts` | **NOVO** - Page Object |

### Áreas de Risco

| Arquivo/Diretório | Risco |
|-------------------|-------|
| `supabase/config.toml` | `site_url` configurado para localhost em dev |
| `src/hooks/useAuth.ts` | Redirecionamento automático pode interferir |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Token de reset expira antes do uso | Baixa | Alto | Supabase tokens expiram em 1h; mostrar erro claro se expirado |
| Redirect URL configurada incorretamente em produção | Alta | Alto | Atualizar `site_url` em `supabase/config.toml` antes de deploy |
| Usuário tenta redefinir senha de conta inexistente | Baixa | Baixo | Supabase retorna sucesso mesmo se email não existe (segurança) |
| Concorrência: múltiplas tentativas com mesmo token | Baixa | Médio | Cada token pode ser usado apenas uma vez |
| XSS via token na URL | Baixa | Alto | Token é opaco, não contém dados sensíveis; usar HTTPS |

## Rollback Plan

1. **Se部署 falhar**: Reverter git, manter código anterior
2. **Se problemas em produção**: Desabilitar página de reset temporariamente via feature flag
3. **Se token flow falhar**: Usuários podem usar "Resend email" para novo token
4. **Não há impacto em dados**: Apenas novas páginas e API routes

## Success Criteria

- [ ] Usuário consegue redefinir senha via link de email (fluxo completo)
- [ ] Página `/reset-password` renderiza corretamente com token válido
- [ ] Página `/reset-password` mostra erro com token invogado/expirado
- [ ] Página `/admin/reset-password` funciona para admins
- [ ] API route `/api/auth/reset-password` valida e atualiza senha
- [ ] Redirecionamento para `/login` após sucesso
- [ ] Testes E2E cobrem fluxo completo e passam
- [ ] Compatibilidade com template de email existente
- [ ] Código segue convenções do projeto (pt-BR, mobile-first, DDD onde aplicável)