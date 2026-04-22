# Tasks: Implementação de Testes E2E Funcionais

## Fase 1: Configurar Supabase Local

### 1.1 Verificar estrutura atual de migrations
**Arquivo:** Verificar `supabase/migrations/` existente
- Listar migrations existentes
- Identificar schema atual

### 1.2 Configurar Docker Compose para Supabase local
**Arquivo:** `docker-compose.yml` ou `supabase/config.toml`
- Configurar Postgres com extensions necessárias
- Configurar Kong (API gateway)
- Configurar GoTrue (auth)

### 1.3 Verificar migrations de auth
**Verificação:** Tables de auth existem (users, sessions, etc.)

---

## Fase 2: Criar Script de Seed

### 2.1 Criar diretório de scripts
**Arquivo:** `tests/e2e/scripts/seed.ts`
- Setup inicial

### 2.2 Implementar função de criar usuários
**Requisitos:**
- `createTestUser(email, password, role)` via Supabase Admin API
- Usar service_role key (não exposta em client)
- Retornar user ID

### 2.3 Implementar função de criar dados de cardápio
**Requisitos:**
- `createTestCategory(name)` via API admin
- `createTestProduct(name, price, categoryId)` via API admin
- `createTestTable(code)` via API admin

### 2.4 Criar função de cleanup
**Requisitos:**
- Deletar usuários criados
- Limpar dados de teste

---

## Fase 3: Atualizar Fixtures e Setup

### 3.1 Criar setup.ts com beforeAll/afterAll
**Arquivo:** `tests/e2e/support/setup.ts`
- `beforeAll`: executar seed
- `afterAll`: executar cleanup

### 3.2 Atualizar fixtures para usar dados reais
**Arquivo:** `tests/e2e/tests/shared/fixtures/index.ts`
- `seedData` fixture: usar dados do seed
- `performLogin`: deve funcionar com usuário criado

### 3.3 Criar helper de API para testes
**Arquivo:** `tests/e2e/support/api.ts`
- Wrapper para chamadas API admin
- Funções para criar/limpar dados

---

## Fase 4: Configurar CI

### 4.1 Atualizar e2e.yml workflow
**Arquivo:** `.github/workflows/e2e.yml`
- Adicionar step de seed antes dos testes
- Configurar ordem de execução (seed → tests → cleanup)
- Publicar artefatos apenas em falha

### 4.2 Configurar Supabase para CI
**Opções:**
- Supabase CLI local (mais pesado)
- Postgres + migrations diretas
- Usar banco do CI com migrations

---

## Fase 5: Verificação

### 5.1 Testar seed script localmente
- Executar `pnpm test:e2e:seed`
- Verificar que usuários foram criados

### 5.2 Testar fixtures
- Executar `pnpm test:e2e:smoke`
- Verificar que login funciona

### 5.3 Verificar CI
- Trigger workflow dispatch
- Verificar que passa em todos os browsers

### 5.4 Medir performance
- Tempo antes/depois
- Reportar métricas

---

## Status

- [ ] 1.1 Verificar estrutura migrations
- [ ] 1.2 Configurar Docker Compose
- [ ] 1.3 Verificar auth tables
- [ ] 2.1 Criar diretório scripts
- [ ] 2.2 Criar usuários
- [ ] 2.3 Criar dados cardápio
- [ ] 2.4 Cleanup
- [ ] 3.1 Setup hooks
- [ ] 3.2 Atualizar fixtures
- [ ] 3.3 Helper API
- [ ] 4.1 Workflow CI
- [ ] 4.2 Supabase CI
- [ ] 5.1-5.4 Verificação