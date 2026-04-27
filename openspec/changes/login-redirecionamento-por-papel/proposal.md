# Proposal: Redirecionamento por Papel Após Login

## Intent

Após o login, o sistema deve detectar automaticamente o papel do usuário (`owner`, `manager`, `staff` vs `cliente`) e redirecioná-lo para a área correspondente — admin ou customer. Hoje o `/login` redireciona incondicionalmente para `/menu`, ignorando se o usuário tem acesso administrativo.

## Scope

### In Scope
- Detecção de papel do usuário via consulta à tabela `users_profiles` após login
- Redirecionamento inteligente: admin → `/admin/dashboard`, cliente → `/menu`
- Atualização do fluxo em `/login` (customer login) para incluir verificação de papel
- Manter `/admin/login` como atalho para admins (redireciona para `/admin/dashboard` se já autenticado)
- Consistência: após logout, sempre voltar para `/login`

### Out of Scope
- Modificação no fluxo de registro (`/register`)
- Alteração no design das páginas de login (agora é identidade visual, não redirect)
- Criação de novo endpoint de API para verificar papel — usar `/api/admin/users` ou query direta na `users_profiles`
- Implementação de middleware de autenticação (fica para SDD futuro)

## Approach

### Fluxo Proposto

```
Usuário acessa /login
       ↓
   Login via Supabase Auth
       ↓
   Consulta users_profiles.role via service role key
       ↓
   Papel === 'owner' | 'manager' | 'staff'?
    ↓ SIM                    ↓ NÃO
/admin/dashboard            /menu
```

### Implementação

1. **Criar hook `useRedirectByRole`** em `src/hooks/useRedirectByRole.ts`:
   - Recebe `userId` do Supabase Auth
   - Consulta `users_profiles` para obter `role`
   - Retorna o destino correto (`/admin/dashboard` ou `/menu`)

2. **Modificar `/src/app/login/page.tsx`**:
   - Após login bem-sucedido, chamar `useRedirectByRole`
   - Redirecionar para o destino retornado

3. **Manter compatibilidade**:
   - Se usuário já tem sessão válida, o `useEffect` de checagem de sessão também deve verificar papel e redirecionar

4. **API interna (opcional, se precisar)**:
   - Criar `GET /api/auth/me` que retorna `{ role, restaurant_id }` — pode ser útil para outras partes do sistema

### Detecção de Papel

A tabela `users_profiles` possui coluna `role` com valores:
- `owner` — acesso completo admin
- `manager` — acesso admin parcial
- `staff` — acesso admin limitado
- `cliente` — cliente normal (sem acesso admin)

**Regra:** Se `role ∈ {owner, manager, staff}` → redirecionar para admin.

## Affected Areas

| Arquivo | Impacto |
|---------|---------|
| `src/app/login/page.tsx` | Redirecionamento pós-login |
| `src/hooks/useAuth.ts` | Pode precisar de ajustes para expor `role` |
| `src/components/auth/LoginForm.tsx` | Nenhum (já delega para parent) |
| `src/app/admin/login/page.tsx` | Nenhum (mantém comportamento atual) |

## Risks

1. **Latência adicional**: consultar `users_profiles` após login adiciona ~100-200ms. Mitigação: cachear role no session/cookie.
2. **Usuário sem perfil**: se `users_profiles` não existir para o user, tratar como cliente. Mitigação: fallback graceful para `/menu`.
3. **Inconsistência de cache**: role pode mudar no DB mas cache local estar desatualizado. Mitigação: invalidar cache ao fazer logout.

## Rollback Plan

- Reverter変更 em `src/app/login/page.tsx` para `router.push('/menu')` fixo
- Remover `useRedirectByRole` se criado
- Ping: ~15 minutos

## Success Criteria

1. **GIVEN** um usuário com role `owner` faz login em `/login`
   **THEN** é redirecionado para `/admin/dashboard`

2. **GIVEN** um usuário com role `cliente` faz login em `/login`
   **THEN** é redirecionado para `/menu`

3. **GIVEN** um usuário com role `manager` faz login em `/login`
   **THEN** é redirecionado para `/admin/dashboard`

4. **GIVEN** um usuário autenticado (com sessão) acessa `/login` diretamente
   **THEN** é redirecionado para a área correspondente ao seu papel (não fica na login page)

5. Build passa com `pnpm run build`
6. Testes E2E de login passam

## Open Questions

- O `/admin/login` deve continuar existindo como rota separada ou deve ser unificado em `/login`?
- Devemos exibir na UI de login alguma indicação de "área admin" vs "área cliente"?
- O hook `useAuth` deve expor o `role` diretamente para consumers?
