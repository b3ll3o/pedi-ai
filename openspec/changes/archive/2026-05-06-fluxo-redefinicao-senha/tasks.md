# Tasks: Fluxo Completo de Redefinição de Senha

## Phase 1: Foundation (Atualizar função resetPassword)

- [ ] 1.1 Modificar `src/lib/supabase/auth.ts`: adicionar parâmetro `redirectTo?: string` na função `resetPassword`
- [ ] 1.2 Passar `redirectTo` para `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- [ ] 1.3 Atualizar tipos exportados se necessário

## Phase 2: API Route (Backend)

- [ ] 2.1 Criar `src/app/api/auth/reset-password/route.ts`
- [ ] 2.2 Implementar validação de request (token e novaSenha obrigatórios)
- [ ] 2.3 Criar Supabase Admin client com Service Role Key
- [ ] 2.4 Chamar `supabaseAdmin.auth.updateUser()` com novo password
- [ ] 2.5 Retornar JSON com `success: true` ou erro estruturado
- [ ] 2.6 Tratar erros: token expirado, inválido, e erros internos

## Phase 3: Reset Password Form Component

- [ ] 3.1 Criar `src/components/auth/ResetPasswordForm.tsx`
- [ ] 3.2 Receber `token` via props (extraído da URL pela página)
- [ ] 3.3 Implementar estado: `novaSenha`, `confirmarSenha`, `error`, `isLoading`, `success`
- [ ] 3.4 Implementar validação: senhas coincidem, mínimo 6 caracteres
- [ ] 3.5 Implementar `handleSubmit`: POST para `/api/auth/reset-password`
- [ ] 3.6 Exibir mensagens de sucesso/erro
- [ ] 3.7 Callback `onSuccess` após redefinição bem-sucedida
- [ ] 3.8 Criar `src/components/auth/ResetPasswordForm.module.css` com estilos (seguir padrão LoginForm)

## Phase 4: Customer Reset Password Page

- [ ] 4.1 Criar `src/app/reset-password/page.tsx`
- [ ] 4.2 Extrair `token` e `type` de `useSearchParams()`
- [ ] 4.3 Validar presença do token, mostrar erro se ausente
- [ ] 4.4 Renderizar `<ResetPasswordForm token={token} onSuccess={...} />`
- [ ] 4.5 Em `onSuccess`: redirecionar para `/login?reset=success`
- [ ] 4.6 Criar `src/app/reset-password/page.module.css` (mobile-first, seguir `/login`)
- [ ] 4.7 Adicionar header com botão voltar para `/login`
- [ ] 4.8 Tratar caso `type=recovery` diferente de `recovery` (erro)

## Phase 5: Admin Reset Password Page

- [ ] 5.1 Criar `src/app/admin/reset-password/page.tsx`
- [ ] 5.2 Mesma lógica de extração de token e validação
- [ ] 5.3 Renderizar `<ResetPasswordForm isAdmin onSuccess={...} />`
- [ ] 5.4 Em `onSuccess`: redirecionar para `/admin/login?reset=success`
- [ ] 5.5 Criar `src/app/admin/reset-password/page.module.css` (estilo admin)
- [ ] 5.6 Tratar erro de token ausente/inválido com link para solicitar novo

## Phase 6: Login Page Updates (Success Message)

- [ ] 6.1 Modificar `src/app/login/page.tsx`: ler `searchParams.get('reset')`
- [ ] 6.2 Se `reset === 'success'`: exibir mensagem "Senha redefinida com sucesso. Faça login."
- [ ] 6.3 Same para `src/app/admin/login/page.tsx`

## Phase 7: E2E Tests

- [ ] 7.1 Criar `tests/e2e/pages/CustomerResetPasswordPage.ts`
- [ ] 7.2 Criar `tests/e2e/pages/AdminResetPasswordPage.ts`
- [ ] 7.3 Implementar Page Objects com:
  - `getNewPasswordInput()`
  - `getConfirmPasswordInput()`
  - `getSubmitButton()`
  - `submit(newPassword)`
  - `getErrorMessage()`
  - `getSuccessMessage()`
- [ ] 7.4 Criar `tests/e2e/tests/auth/reset-password.spec.ts`
- [ ] 7.5 Cenário E2E: "Cliente esquece senha, recebe email, redefine e faz login"
- [ ] 7.6 Cenário E2E: "Token inválido mostra mensagem de erro"
- [ ] 7.7 Cenário E2E: "Senhas diferentes mostra erro de validação"
- [ ] 7.8 Atualizar `tests/e2e/README.md` com novo fluxo coberto

## Phase 8: Verification

- [ ] 8.1 Executar `npm run lint` - corrigir qualquer warning
- [ ] 8.2 Executar `npm run typecheck` - corrigir erros de tipo
- [ ] 8.3 Executar `npm run test` - garantir testes unitários passam
- [ ] 8.4 Executar `npm run test:e2e` - garantir testes E2E passam
- [ ] 8.5 Verificar visualmente: página `/reset-password` com token válido renderiza corretamente
- [ ] 8.6 Verificar visualmente: página `/reset-password` com token inválido mostra erro
- [ ] 8.7 Verificar visualmente: após redefinir, redireciona para `/login` com mensagem de sucesso
- [ ] 8.8 Testar同样的 fluxos para admin em `/admin/reset-password`