# Design: Fluxo Completo de Redefinição de Senha

## Technical Approach

O fluxo de redefinição de senha será implementado usando Next.js App Router com Supabase Auth. A estratégia é:

1. **Cliente**: Página React com `useSearchParams` para extrair token da URL
2. **API Route**: Server-side handler para validar token e atualizar senha via Supabase Admin API
3. **UI**: Formulário com validação client-side antes de submissão

## Architecture Decisions

### Decision: Usar API Route separado para atualização de senha

**Choice**: Criar `/api/auth/reset-password` em vez de usar `supabase.auth.updateUser()` diretamente no cliente

**Alternatives considered**:
- Atualizar senha diretamente no cliente via `supabase.auth.updateUser()` - REJEITADO porque expõe credenciais
- Usar Supabase Edge Functions - REJEITADO porque adiciona complexidade desnecessária

**Rationale**: O token de reset é um token de alta privilegi. Fazer a atualização via API route permite:
- Validar o token server-side antes de processar
- Esconder a Service Role Key do cliente
- Retornar erros estruturados em JSON

### Decision: Redirecionar para /login após sucesso

**Choice**: Após redefinição de senha, redirecionar para `/login?reset=success`

**Alternatives considered**:
- Redirecionar para `/menu` diretamente - REJEITADO porque o usuário deve fazer login com nova senha
- Manter usuário logado - REJEITADO por segurança (token de reset não deve criar sessão automaticamente)

**Rationale**: UX padrão de recuperação de senha; força usuário a autenticar com nova credencial.

### Decision: Páginas separadas para cliente e admin

**Choice**: `/reset-password` para clientes e `/admin/reset-password` para admins

**Rationale**: Permite UI diferenciado entre cliente (mobile-first, estilo consumer) e admin (dashboard). O fluxo de token é idêntico.

### Decision: Token via URL query param

**Choice**: Extrair token de `?token=xxx&type=recovery`

**Rationale**: Supabase Auth envia tokens assim por padrão. Não há necessidade de mudar.

## Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ LoginForm    │────▶│ resetPassword│────▶│ Supabase Auth   │
│ (clique em   │     │ (email)      │     │ (envia email)   │
│  esqueci)    │     └──────────────┘     └─────────────────┘
└─────────────┘

┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ Email Link   │────▶│ /reset-      │────▶│ useSearchParams │
│ (token in   │     │ password     │     │ (extrai token)  │
│  URL)       │     │ ?token=xxx   │     └────────┬────────┘
└─────────────┘     └──────────────┘              │
                                                  ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│ LoginPage   │◀────│ redirect     │◀────│ API Route       │
│ ?reset=     │     │ (sucesso)    │     │ POST /api/auth/ │
│ success     │     └──────────────┘     │ reset-password  │
└─────────────┘                          └─────────────────┘
```

## File Changes

### Novos Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/app/reset-password/page.tsx` | Página de redefinição para clientes |
| `src/app/reset-password/page.module.css` | Estilos da página cliente |
| `src/app/reset-password/ResetPasswordForm.tsx` | Componente de formulário reutilizável |
| `src/app/reset-password/ResetPasswordForm.module.css` | Estilos do formulário |
| `src/app/admin/reset-password/page.tsx` | Página de redefinição para admins |
| `src/app/admin/reset-password/page.module.css` | Estilos da página admin |
| `src/app/api/auth/reset-password/route.ts` | API route para atualizar senha |
| `tests/e2e/pages/CustomerResetPasswordPage.ts` | Page Object para testes E2E |
| `tests/e2e/pages/AdminResetPasswordPage.ts` | Page Object para testes E2E |
| `tests/e2e/tests/auth/reset-password.spec.ts` | Testes E2E do fluxo completo |

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/supabase/auth.ts` | Adicionar `redirectTo` em `resetPassword()` |
| `src/templates/email/reset-password.html` | ConfirmationURL com base URL correta |

## Interfaces / Contratos

### API Route: `/api/auth/reset-password`

**Request:**
```typescript
POST /api/auth/reset-password
Content-Type: application/json

{
  token: string,      // Token de reset da URL
  novaSenha: string   // Nova senha (mínimo 6 caracteres)
}
```

**Response (sucesso):**
```typescript
{
  success: true,
  message: "Senha atualizada com sucesso"
}
```

**Response (erro):**
```typescript
{
  success: false,
  error: "Token inválido ou expirado" | "Nova senha é obrigatória" | "Erro interno"
}
```

### Componente: ResetPasswordForm

```typescript
interface ResetPasswordFormProps {
  onSuccess?: () => void;  // Callback após sucesso
  onError?: (error: string) => void;  // Callback de erro
  isAdmin?: boolean;  // Se true, usa estilo admin
}
```

## Testing Strategy

1. **Unit tests** (se existentes):
   - Validação de formulário
   - Lógica de extração de token

2. **Testes E2E**:
   - Fluxo completo: `/login` → "Esqueci senha" → email → `/reset-password` → nova senha → `/login` → sucesso
   - Cenário de token inválido
   - Cenário de token expirado

## Migration / Rollout

Não há migração de dados necessária. O fluxo é completamente novo.

## Open Questions

1. **Configuração de production**: O `site_url` no `supabase/config.toml` precisa ser atualizado para o domínio de production antes de deploy. Quem é responsável por isso?

2. **Tempo de expiração do token**: Tokens de reset do Supabase expiram em 1 hora. O frontend exibe mensagem clara quando token está inválido/expirado.

3. **Rate limiting**: O API route deve implementar rate limiting para prevenir ataques de força bruta na redefinição? (Recomendado: implementar futuramente via Supabase ou middleware)