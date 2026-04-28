# Design: Registro com Seleção de Intenção + Roles em Português

## Technical Approach

### Resumo da Mudança
1. Roles renomeados para pt-BR: `owner→dono`, `manager→gerente`, `staff→atendente`, `cliente` (novo)
2. Durante registro, usuário escolhe intenção: "gerenciar restaurante" ou "fazer pedidos"
3. Após registro, redirect baseado na intenção: `dono` → `/admin/restaurants/new`, `cliente` → `/menu`

## Architecture Decisions

### Decision 1: Nova Role `cliente` separada de `atendente`
**Choice:** Adicionar `cliente` como role distinta de `atendente`
**Alternatives considered:** Usar `staff` com `intent` separado
**Rationale:** `cliente` é semanticamente diferente de `atendente`. Cliente faz pedidos, atendente trabalha no restaurante.

### Decision 2: Roles em Português
**Choice:** `dono`, `gerente`, `atendente`, `cliente`
**Alternatives considered:** Manter em inglês (`owner`, `manager`, `staff`, `customer`)
**Rationale:** Projeto em português brasileiro, UI em pt-BR, usuários esperam roles em pt-BR.

### Decision 3: intent como parte do profile, não coluna separada
**Choice:** Usar `intent` na tabela `users_profiles` junto com `role`
**Alternatives considered:** Criar coluna separada `intent TEXT`
**Rationale:** Mantém a estrutura simples; intent pode ser inferido do `role` na maioria dos casos.

## Data Flow

### Fluxo de Registro
```
/register → RegisterForm
  ↓ (seleciona intenção)
handleRegister(email, password, intent)
  ↓
signUp(email, password) → Supabase Auth
  ↓ (trigger ou API)
Cria users_profiles com role + intent
  ↓
redirect → /login?registered=true&intent=xxx
  ↓
login → useRedirectByRole
  ↓
intent=gerenciar → /admin/restaurants/new
intent=fazer_pedidos → /menu
```

## File Changes

### 1. `src/lib/supabase/types.ts`
```typescript
// ANTES:
export type Enum_user_role = 'owner' | 'manager' | 'staff';

// DEPOIS:
export type Enum_user_role = 'dono' | 'gerente' | 'atendente' | 'cliente';
```

### 2. `src/lib/auth/admin.ts` e `src/lib/auth/client-admin.ts`
```typescript
// ANTES:
export type Role = Extract<Enum_user_role, 'owner' | 'manager' | 'staff'>;

// DEPOIS:
export type Role = Extract<Enum_user_role, 'dono' | 'gerente' | 'atendente'>;
export type Intent = 'gerenciar_restaurante' | 'fazer_pedidos';
```

### 3. `src/components/auth/RegisterForm.tsx`
- Adicionar state `intent: Intent`
- Adicionar UI de seleção (botões/cards)
- Mudar `onSubmit` para `(email: string, password: string, intent: Intent)`
- Validar que intent foi selecionado antes de submeter

### 4. `src/app/register/page.tsx`
- Atualizar `handleRegister` para receber intent
- Passar intent ao criar profile
- Redirect para `/login?registered=true&intent=xxx`

### 5. `src/hooks/useRedirectByRole.ts`
```typescript
// owner (dono) sem restaurant_id → redirect especial
if (role === 'dono' && !restaurant_id) {
  return '/admin/restaurants/new'
}
```

### 6. `supabase/migrations/` (novo arquivo de migration)
```sql
-- Renomear enum existente
ALTER TYPE Enum_user_role RENAME TO Enum_user_role_old;
CREATE TYPE Enum_user_role AS ENUM ('dono', 'gerente', 'atendente', 'cliente');
-- Migração de dados
UPDATE users_profiles SET role = 'dono'::Enum_user_role WHERE role = 'owner';
UPDATE users_profiles SET role = 'gerente'::Enum_user_role WHERE role = 'manager';
UPDATE users_profiles SET role = 'atendente'::Enum_user_role WHERE role = 'staff';
-- Adicionar role 'cliente' para quem não tem restaurant (novos registros)
-- Drop old enum
DROP TYPE Enum_user_role_old;
```

### 7. `tests/e2e/scripts/seed.ts`
```typescript
// seed de E2E precisa criar customer com role 'cliente'
// admin com role 'dono'
// waiter com role 'atendente'
```

## Interfaces / Contracts

### RegisterForm
```typescript
interface RegisterFormProps {
  onSubmit?: (email: string, password: string, intent: Intent) => Promise<void>;
}
```

### Intent type
```typescript
type Intent = 'gerenciar_restaurante' | 'fazer_pedidos';
```

### useRedirectByRole
```typescript
interface UseRedirectByRoleResult {
  destination: '/admin/dashboard' | '/admin/restaurants/new' | '/menu';
  isLoading: boolean;
  role: string | null;
}
```

## Testing Strategy

### Unit tests
- `useRedirectByRole` com `dono` sem restaurant → `/admin/restaurants/new`
- `useRedirectByRole` com `dono` com restaurant → `/admin/dashboard`
- `useRedirectByRole` com `cliente` → `/menu`

### E2E tests
- Registro como dono → redireciona para `/admin/restaurants/new`
- Registro como cliente → redireciona para `/menu`
- Login como dono sem restaurant → `/admin/restaurants/new`
- Login como cliente → `/menu`

## Migration / Rollout

### Fase 1: Database Migration
1. Criar novo enum com roles em pt-BR
2. Migrar dados existentes
3. Adicionar valor `cliente` ao enum

### Fase 2: Código Frontend
1. Atualizar types
2. Atualizar hooks
3. Atualizar RegisterForm
4. Deployar

### Rollback
1. Reverter tipos para inglês
2. Reverter dados no banco
3. Reverter enum

## Open Questions

1. **Quando `dono` acessa `/menu`?** Permitir acesso público ou apenas ao admin?
2. **Se `atendente` faz login?** Redirect para `/admin/dashboard` ou área de garçom?
3. **Superadmin?** Existe role acima de `dono` para plataforma?
