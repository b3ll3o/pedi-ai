# Design: Login Role-Based Redirect

## Overview

Implementar detecção de papel do usuário após login e redirecionamento inteligente para `/admin/dashboard` (admin) ou `/menu` (cliente).

## Architecture

### Hook: `useRedirectByRole`

**Local:** `src/hooks/useRedirectByRole.ts`

```typescript
interface UseRedirectByRoleResult {
  destination: '/admin/dashboard' | '/menu'
  isLoading: boolean
}

/**
 * Hook para detectar o papel do usuário e retornar destino de redirect.
 * Usa service role key para consultar users_profiles sem RLS.
 */
export function useRedirectByRole(userId: string): UseRedirectByRoleResult
```

**Lógica:**
1. Recebe `userId` do Supabase Auth session
2. Cria Supabase client com SERVICE_ROLE_KEY
3. Consulta `users_profiles` filtrando por `user_id`
4. Retorna `role` do perfil
5. Aplica regra: `role ∈ {owner, manager, staff}` → `/admin/dashboard`, senão → `/menu`
6. Se perfil não existir → tratar como `cliente` → `/menu`

### Modificação em `/src/app/login/page.tsx`

**Antes:**
```typescript
const handleLogin = async (email: string, password: string) => {
  await signIn(email, password)
  router.push('/menu')
}
```

**Depois:**
```typescript
const handleLogin = async (email: string, password: string) => {
  await signIn(email, password)
  const session = await getSession()
  if (session?.user) {
    const { destination } = useRedirectByRole(session.user.id)
    router.push(destination)
  } else {
    router.push('/menu')
  }
}
```

**Session check useEffect (linha 15-30):**
- Já existente para checar sessão
- Após detectar sessão válida, usar `useRedirectByRole` para redirecionar antes de mostrar login

### API Route (se necessário)

Se a consulta direta no client for complexa, criar `GET /api/auth/role`:

**Local:** `src/app/api/auth/role/route.ts`

```typescript
// GET /api/auth/role
// Returns: { role: string | null }
```

Porém, o hook `useRedirectByRole` pode fazer a query diretamente via Supabase client admin sem necessidade de API route, evitando overhead de rede adicional.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useRedirectByRole.ts` | **CREATE** — novo hook |
| `src/app/login/page.tsx` | **MODIFY** — usar hook para redirect |
| `src/app/(customer)/checkout/CheckoutClient.tsx` | **MODIFY** — se usar logout, verificar redirect |
| `src/components/customer/CustomerHeader.tsx` | **MODIFY** — logout redirect para `/login` |

## Files to Verify (no change needed)

- `src/app/admin/login/page.tsx` — já redireciona para `/admin/dashboard`, mantém comportamento
- `src/components/auth/LoginForm.tsx` — já delega para parent, nenhum change

## Edge Cases

1. **Usuário com sessão mas sem perfil:** Tratar como `cliente` → `/menu`
2. **Erro na consulta de perfil:** Fallback para `/menu` com log de erro
3. **Concurrent login:** Cada login válido sobrescreve sessão anterior — comportamento aceitável

## Testes

### Unitários
- `useRedirectByRole` com role `owner` → `/admin/dashboard`
- `useRedirectByRole` com role `cliente` → `/menu`
- `useRedirectByRole` com perfil inexistente → `/menu`

### E2E
- Fluxo: login como owner → `/admin/dashboard`
- Fluxo: login como cliente → `/menu`
- Fluxo: acessa `/login` logado como admin → `/admin/dashboard`
