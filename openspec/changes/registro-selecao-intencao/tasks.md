# Tasks: Registro com Seleção de Intenção + Roles em Português

## Phase 1: Database Migration

- [x] 1.1 Criar migration SQL para roles em pt-BR em `supabase/migrations/`
  ## Verification
  Run: `ls supabase/migrations/0021_rename_roles_to_ptbr.sql`
  Expected: Arquivo existe ✅

- [-] 1.2 Executar migration no banco (desenvolvimento local)
  ## Verification
  Run: N/A (requer acesso ao banco Supabase local)
  Expected: Skipped - arquivo de migration criado, execução requer Supabase CLI ou acesso direto ao banco

## Phase 2: Type Updates

- [x] 2.1 Atualizar `src/lib/supabase/types.ts` — `Enum_user_role` para pt-BR ✅
- [x] 2.2 Atualizar `src/lib/auth/admin.ts` — Role type com novos valores ✅
- [x] 2.3 Atualizar `src/lib/auth/client-admin.ts` — Role type com novos valores ✅
- [x] 2.4 Atualizar `src/services/userService.ts` — UserRole type (já era alias, compatível) ✅

## Phase 3: RegisterForm UI Changes

- [x] 3.1 Adicionar tipo `Intent` em `src/components/auth/RegisterForm.tsx` ✅
- [x] 3.2 Adicionar state `intent` no RegisterForm ✅
- [x] 3.3 Adicionar UI de seleção de intenção (botões/cards) ✅
- [x] 3.4 Atualizar `onSubmit` para `(email, password, intent)` ✅
- [x] 3.5 Validar intent selecionado antes de submeter ✅

## Phase 4: Register Page Changes

- [x] 4.1 Atualizar `handleRegister` em `src/app/register/page.tsx` para receber intent ✅
- [x] 4.2 Após registro, criar profile com intent via API call ✅ (nova API route criada)
- [x] 4.3 Redirect para `/login?registered=true&intent=xxx` ✅

## Phase 5: useRedirectByRole Updates

- [x] 5.1 Atualizar lógica para `dono` sem restaurant_id → `/admin/restaurants/new` ✅
- [x] 5.2 Manter `dono` com restaurant_id → `/admin/dashboard` ✅
- [x] 5.3 Manter `cliente` → `/menu` ✅

## Phase 6: E2E Seed Updates

- [x] 6.1 Atualizar `tests/e2e/scripts/seed.ts` — roles em pt-BR ✅
- [x] 6.2 Seed customer → role `cliente` ✅ (já estava)
- [x] 6.3 Seed admin → role `dono` ✅
- [x] 6.4 Seed waiter → role `atendente` ✅

## Phase 7: Build & Tests

- [~] 7.1 Executar `pnpm run build` — deve passar
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
