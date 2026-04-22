# Proposal: Implementação de Testes E2E Funcionais

## Problem Statement

Os testes E2E atuais **não funcionam** porque:

1. **Usuários não existem no banco** - Os testes usam `seedData.admin.email` que é um email gerado aleatoriamente, mas o usuário não é criado no Supabase antes do login.

2. **Sem seed de dados** - Categorias, produtos e outras entidades não são criados antes dos testes.

3. **Sem Supabase local** - O CI usa Postgres vanilla, mas o Supabase precisa de suas tabelas de autenticação e RLS.

4. **Fixtures tentam login real** - `performLogin()` tenta fazer login com credenciais que não existem.

## Options de Solução

### Option A: Supabase Local + Seed Script (Recomendado)

Usar `supabase local dev` com Docker e criar script de seed.

**Prós:**
- Ambiente real de Supabase (auth, RLS, etc.)
- Totalmente funcional
- Funciona em CI

**Contras:**
- Dependência de Docker
- Mais pesado para rodar local

### Option B: API Mocking Completo

Mockar todas as chamadas API com `page.route()`.

**Prós:**
- Rápido (sem banco)
- Funciona offline
- Estável

**Contras:**
- Não testa integração real
- Manutenção de mocks complexa
- Não captura bugs de API

### Option C: Seed via Admin API

Criar usuários e dados via API do Supabase Admin antes dos testes.

**Prós:**
- Usa Supabase real (cloud ou local)
- Teste de integração real

**Contras:**
- Requer service_role key
- Mais lento
- Cleanup necessário

## Recomendação

**Option A (Supabase Local + Seed)** - Proposta para implementação.

## Scope

### In Scope

1. **Configurar Supabase Local**
   - Criar `supabase/config.toml` local
   - Configurar Docker Compose para Supabase
   - Migrações de schema

2. **Criar Script de Seed**
   - `tests/e2e/scripts/seed.ts`
   - Criar usuários de teste via Supabase Admin API
   - Criar categorias, produtos, mesas

3. **Atualizar Fixtures**
   - `beforeAll` para executar seed
   - Criar usuários reais antes dos testes
   - `afterAll` para cleanup

4. **Configurar CI**
   - Usar Supabase CLI em CI
   - Ou usar banco Postgres + migrations
   - Configurar matrix de browsers

5. **Fixtures de Test Data**
   - `testData` fixture que cria dados e limpa ao final
   - Helper para criar pedidos, categorias, etc.

### Out of Scope

- Migration de schema do zero (já existe)
- Setup de email real (usar Ethereal/Pila)
- Testes de performance/load

## Arquitetura Proposta

```
tests/e2e/
├── scripts/
│   └── seed.ts              # Script de seed via Supabase Admin
├── support/
│   ├── setup.ts            # beforeAll/afterAll hooks
│   └── database.ts         # Helpers de cleanup
├── fixtures/
│   └── index.ts            # Ja existente - atualizar
└── tests/
    └── ...                 # Ja existente
```

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Docker não instalado | Média | Tests não rodam | Documentar dependência |
| Seed lento | Baixa | CI demorado | Usar API batch |
| Dados persistentes entre runs | Baixa | Flaky tests | Cleanup em beforeEach |
| Auth via email lento | Média | Tests demorados | Usar phone OTP ou mock |

## Success Criteria

- [ ] `pnpm test:e2e` executa localmente com servidor rodando
- [ ] `pnpm test:e2e:smoke` executa em < 5 minutos
- [ ] CI passa em todos os 3 browsers
- [ ] 0 flaky tests (exceto os marcados @slow)
- [ ] Relatório de testes publicado no GitHub PR

## Cronograma Estimado

| Fase | Tarefa | Tempo |
|------|--------|-------|
| 1 | Configurar Supabase local e migrations | 2h |
| 2 | Criar script de seed | 2h |
| 3 | Atualizar fixtures e setup | 2h |
| 4 | Configurar CI | 1h |
| 5 | Testar e ajustar | 2h |
| **Total** | | **9h** |