# Proposal: Seleção de Intenção do Usuário no Registro

## Intent

No momento do cadastro, o sistema deve perguntar ao usuário qual é sua intenção ao usar o Pedi-AI:
- **"Quero gerenciar meu restaurante"** (fluxo admin)
- **"Quero fazer pedidos"** (fluxo cliente)

A escolha deve ser salva no banco de dados e usada para determinar a página inicial após o registro.

## Scope

### In Scope
- Nova pergunta/step no fluxo de registro em `/register`
- Dois tipos de intenção: `gerenciar_restaurante` ou `fazer_pedidos`
- Salvar intenção na tabela `users_profiles` (nova coluna `intent` ou novo role `cliente`)
- Redirecionamento pós-registro baseado na intenção:
  - `gerenciar_restaurante` → `/admin/restaurants/new` (criar primeiro restaurante)
  - `fazer_pedidos` → `/menu`
- Após login, manter comportamento atual de redirect por papel (já implementado)

### Out of Scope
- Criação de restaurante durante o registro (apenas salvar a intenção)
- Modificação no fluxo de convite de staff
- Alteração no schema de autenticação do Supabase

## Approach

### Fluxo Proposto

```
Usuário acessa /register
       ↓
   Preenche email/senha
       ↓
   Seleciona intenção:
   - "Quero gerenciar meu restaurante" → role dono (sem restaurant ainda)
   - "Quero fazer pedidos" → role cliente (sem restaurant)
       ↓
   Conta criada no Supabase Auth
       ↓
   Profile criado com intent + role
       ↓
   Redireciona para:
   - gerenciar_restaurante → /admin/restaurants/new (criar restaurante)
   - fazer_pedidos → /menu
```

### Detalhes de Implementação

#### 1. Roles em Português

O enum `Enum_user_role` atual é `owner | manager | staff | cliente`. Vamos alterar para português:

```sql
ALTER TYPE Enum_user_role RENAME TO Enum_user_role_old;
CREATE TYPE Enum_user_role AS ENUM ('dono', 'gerente', 'atendente', 'cliente');
-- Migração de dados: owner→dono, manager→gerente, staff→atendente, cliente→cliente
```

| Inglês | Português |
|--------|-----------|
| owner | dono |
| manager | gerente |
| staff | atendente |
| cliente | cliente |

#### 2. Modificar `RegisterForm` para incluir seleção de intenção

Adicionar radio buttons ou cards de seleção após os campos de email/senha:

```tsx
// Opções de intenção
type Intent = 'gerenciar_restaurante' | 'fazer_pedidos'

// UI:
<div className={styles.intentSelection}>
  <button type="button" onClick={() => setIntent('gerenciar_restaurante')}>
    🏪 Quero gerenciar meu restaurante
  </button>
  <button type="button" onClick={() => setIntent('fazer_pedidos')}>
    🍽️ Quero fazer pedidos
  </button>
</div>
```

#### 3. Modificar `handleRegister` em `/register/page.tsx`

```typescript
const handleRegister = async (email: string, password: string, intent: Intent) => {
  await signUp(email, password);
  // intent é salvo junto com o profile via API ou trigger
  router.push('/login?registered=true');
};
```

#### 4. API ou Supabase Trigger para criar profile

Após `signUp` no Supabase Auth, um trigger pode criar o `users_profiles` com:
- `intent: 'gerenciar_restaurante'` → `role: 'dono'`, `restaurant_id: null`
- `intent: 'fazer_pedidos'` → `role: 'cliente'`, `restaurant_id: null`

**Ou via API POST `/api/auth/register`** que cria o profile após o signup.

#### 5. Redirecionamento pós-registro

Na página `/login` após registro (`?registered=true`), mostrar mensagem de boas-vindas e redirecionar baseado na intenção salva.

**Simples:** No `useRedirectByRole` já existente, se `role: 'cliente'` → `/menu`, se `role: 'dono'` → `/admin/restaurants/new`.

## Affected Areas

| Arquivo | Impacto |
|---------|---------|
| `src/app/register/page.tsx` | Adicionar parâmetro intent ao handleRegister |
| `src/components/auth/RegisterForm.tsx` | Adicionar seleção de intenção na UI |
| `src/lib/supabase/types.ts` | Roles em pt-BR: `dono`, `gerente`, `atendente`, `cliente` |
| `supabase/migrations/` | Renomear enum para pt-BR |
| `src/hooks/useRedirectByRole.ts` | Ajustar para `dono` sem restaurant_id → `/admin/restaurants/new` |
| `src/app/login/page.tsx` | Tratamento de `?registered=true` com mensagem e redirect |

## Risks

1. **Banco de dados**: Adicionar valor a enum existente pode causar downtime em produção. Mitigação: usar migration com `IF NOT EXISTS`.
2. **Quebrar testes existentes**: Seed de E2E cria customer com role `cliente` (se existir) ou `staff`. Pode precisar ajustar seed.
3. **Migração de dados**: Usuários existentes não têm `intent` — fallback para `fazer_pedidos`.

## Rollback Plan

- Remover nova coluna/valor de enum do banco
- Reverter `RegisterForm` e `register/page.tsx`
- Remover lógica de redirect especial em `useRedirectByRole`
- Ping: ~30 minutos

## Success Criteria

1. **GIVEN** um usuário seleciona "Quero gerenciar meu restaurante" durante registro
   **THEN** após criar conta, o `users_profiles` tem `role: 'dono'` e `intent: 'gerenciar_restaurante'`
   **AND** o usuário é redirecionado para `/admin/restaurants/new`

2. **GIVEN** um usuário seleciona "Quero fazer pedidos" durante registro
   **THEN** após criar conta, o `users_profiles` tem `role: 'cliente'` e `intent: 'fazer_pedidos'`
   **AND** o usuário é redirecionado para `/menu`

3. **GIVEN** um usuário existente (sem intent) faz login
   **THEN** o sistema usa redirect por papel existente normalmente (dono/gerente/atendente → admin, cliente → menu)

4. Build passa com `pnpm run build`
5. Testes E2E de registro passam

## Open Questions

- A pergunta de intenção deve ser um step separado (multi-step form) ou inline com os campos de registro?
- O que acontece se um usuário com `gerenciar_restaurante` nunca criar um restaurante? Pode acessar `/menu` normalmente?
