# Tasks: Registro com Seleção de Intenção + Roles em Português

## Phase 1: Database Migration

- [ ] 1.1 Criar migration SQL para roles em pt-BR em `supabase/migrations/`
  ## Verification
  Run: `ls supabase/migrations/`
  Expected: Arquivo de migration existe com roles pt-BR

- [ ] 1.2 Executar migration no banco (desenvolvimento local)
  ## Verification
  Run: Query `SELECT enumlabel FROM pg_enum WHERE enumtypid = 'Enum_user_role'::regtype;`
  Expected: Resultado contém 'dono', 'gerente', 'atendente', 'cliente'

## Phase 2: Type Updates

- [ ] 2.1 Atualizar `src/lib/supabase/types.ts` — `Enum_user_role` para pt-BR
  ## Verification
  Run: `grep -n "Enum_user_role" src/lib/supabase/types.ts`
  Expected: `'dono' | 'gerente' | 'atendente' | 'cliente'`

- [ ] 2.2 Atualizar `src/lib/auth/admin.ts` — Role type com novos valores
  ## Verification
  Run: `grep -n "Role = Extract" src/lib/auth/admin.ts`
  Expected: `Extract<Enum_user_role, 'dono' | 'gerente' | 'atendente'>`

- [ ] 2.3 Atualizar `src/lib/auth/client-admin.ts` — Role type com novos valores
  ## Verification
  Run: `grep -n "Role = Extract" src/lib/auth/client-admin.ts`
  Expected: `Extract<Enum_user_role, 'dono' | 'gerente' | 'atendente'>`

- [ ] 2.4 Atualizar `src/services/userService.ts` — UserRole type
  ## Verification
  Run: `grep -n "UserRole" src/services/userService.ts`
  Expected: Type alias para novo Enum_user_role

## Phase 3: RegisterForm UI Changes

- [ ] 3.1 Adicionar tipo `Intent` em `src/components/auth/RegisterForm.tsx`
  ## Verification
  Run: `grep -n "Intent" src/components/auth/RegisterForm.tsx`
  Expected: `type Intent = 'gerenciar_restaurante' | 'fazer_pedidos'`

- [ ] 3.2 Adicionar state `intent` no RegisterForm
  ## Verification
  Run: `grep -n "useState.*intent" src/components/auth/RegisterForm.tsx`
  Expected: State de intent existe

- [ ] 3.3 Adicionar UI de seleção de intenção (botões/cards)
  ## Verification
  Run: `grep -n "gerenciar\|fazer_pedidos" src/components/auth/RegisterForm.tsx`
  Expected: Opções de intent na UI

- [ ] 3.4 Atualizar `onSubmit` para `(email, password, intent)`
  ## Verification
  Run: `grep -n "onSubmit.*intent" src/components/auth/RegisterForm.tsx`
  Expected: Função recebe intent como parâmetro

- [ ] 3.5 Validar intent selecionado antes de submeter
  ## Verification
  Run: `grep -n "intent.*obrig\|intent.*required" src/components/auth/RegisterForm.tsx`
  Expected: Validação de intent

## Phase 4: Register Page Changes

- [ ] 4.1 Atualizar `handleRegister` em `src/app/register/page.tsx` para receber intent
  ## Verification
  Run: `grep -n "handleRegister.*intent" src/app/register/page.tsx`
  Expected: Função recebe intent

- [ ] 4.2 Após registro, criar profile com intent via API call
  ## Verification
  Run: `grep -n "fetch\|api.*register" src/app/register/page.tsx`
  Expected: Chamada de API para criar profile com intent

- [ ] 4.3 Redirect para `/login?registered=true&intent=xxx`
  ## Verification
  Run: `grep -n "registered=true" src/app/register/page.tsx`
  Expected: URL com query params

## Phase 5: useRedirectByRole Updates

- [ ] 5.1 Atualizar lógica para `dono` sem restaurant_id → `/admin/restaurants/new`
  ## Verification
  Run: `grep -n "restaurants/new" src/hooks/useRedirectByRole.ts`
  Expected: Redirect especial para dono sem restaurante

- [ ] 5.2 Manter `dono` com restaurant_id → `/admin/dashboard`
  ## Verification
  Run: `grep -n "dono" src/hooks/useRedirectByRole.ts`
  Expected: Lógica admin roles com novo nome

- [ ] 5.3 Manter `cliente` → `/menu`
  ## Verification
  Run: `grep -n "cliente" src/hooks/useRedirectByRole.ts`
  Expected: Cliente redireciona para menu

## Phase 6: E2E Seed Updates

- [ ] 6.1 Atualizar `tests/e2e/scripts/seed.ts` — roles em pt-BR
  ## Verification
  Run: `grep -n "dono\|gerente\|atendente\|cliente" tests/e2e/scripts/seed.ts`
  Expected: Roles em português

- [ ] 6.2 Seed customer → role `cliente`
  ## Verification
  Run: `grep -n "cliente" tests/e2e/scripts/seed.ts`
  Expected: Customer seed com role cliente

- [ ] 6.3 Seed admin → role `dono`
  ## Verification
  Run: `grep -n "dono" tests/e2e/scripts/seed.ts`
  Expected: Admin seed com role dono

- [ ] 6.4 Seed waiter → role `atendente`
  ## Verification
  Run: `grep -n "atendente" tests/e2e/scripts/seed.ts`
  Expected: Waiter seed com role atendente

## Phase 7: Build & Tests

- [ ] 7.1 Executar `pnpm run build` — deve passar
  ## Verification
  Run: `pnpm run build`
  Expected: Build completo sem errors

- [ ] 7.2 Executar testes E2E de registro — devem passar
  ## Verification
  Run: `pnpm test:e2e --grep "register" 2>&1 | head -50`
  Expected: Testes passam

- [ ] 7.3 Executar testes E2E de login — devem passar
  ## Verification
  Run: `pnpm test:e2e --grep "login" 2>&1 | head -50`
  Expected: Testes passam
