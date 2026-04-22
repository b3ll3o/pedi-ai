# Proposal: Implementação de Testes E2E Funcionais

## Problem Statement

Os testes E2E atuais **não funcionam** porque:

1. **Usuários não existem no banco** - Os testes usam `seedData.admin.email` que é um email gerado aleatoriamente, mas o usuário não é criado no Supabase antes do login.

2. **Sem seed de dados** - Categorias, produtos e outras entidades não são criados antes dos testes.

3. **Sem Supabase local** - O CI usa Postgres vanilla, mas o Supabase precisa de suas tabelas de autenticação e RLS.

4. **Fixtures tentam login real** - `performLogin()` tenta fazer login com credenciais que não existem.

## Options de Solução

### Option A: Supabase Local + Seed Script

Usar `supabase local dev` com Docker e criar script de seed.

**Prós:**
- Ambiente real de Supabase (auth, RLS, etc.)
- Totalmente funcional

**Contras:**
- ⚠️ DEPRECADO - Muito trabalho para configurar localmente
- Dependência de Docker
- Mais pesado para rodar local
- Complexidade desnecessária para testes E2E

### Option B: Supabase Cloud + Seed Script (Recomendado)

Usar Supabase cloud (projeto existente) com script de seed via Admin API.

**Prós:**
- Sem configuração Docker
- Ambiente real de Supabase (cloud)
- Funciona em CI sem configuração adicional
- Mesma experiência local e CI

**Contras:**
- Requer service_role key (já configurada em .env)

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

**Option B (Supabase Cloud + Seed)** - Simplificado, sem Docker.

## Scope

### In Scope

1. **Criar Script de Seed** (via Supabase Cloud Admin API)
   - `tests/e2e/scripts/seed.ts`
   - Criar usuários de teste via Supabase Admin API
   - Criar categorias, produtos, mesas

2. **Configurar Credentials**
   - Verificar `SUPABASE_SERVICE_ROLE_KEY` em `.env.e2e`
   - apontar para o projeto cloud existente

3. **Atualizar Fixtures**
   - `beforeAll` para executar seed
   - Criar usuários reais antes dos testes
   - `afterAll` para cleanup

4. **Configurar CI**
   - Usar Supabase cloud em CI (sem setup adicional)
   - Configurar matrix de browsers

5. **Fixtures de Test Data**
   - `testData` fixture que cria dados e limpa ao final
   - Helper para criar pedidos, categorias, etc.

### Out of Scope

- Docker Compose ou Supabase local (desnecessário com cloud)
- Migration de schema do zero (já existe)
- Setup de email real (usar Ethereal/Pila)
- Testes de performance/load

### Out of Scope

- Migration de schema do zero (já existe)
- Setup de email real (usar Ethereal/Pila)
- Testes de performance/load

## Arquitetura Proposta

```
tests/e2e/
├── scripts/
│   ├── seed.ts              # Script de seed via Supabase Admin (cloud)
│   └── cleanup.ts           # Cleanup de dados de teste
├── support/
│   ├── setup.ts            # beforeAll/afterAll hooks
│   └── api.ts              # Wrapper API admin
├── fixtures/
│   └── index.ts            # Ja existente - alinhado com seed
└── tests/
    └── ...                 # Ja existente
```

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Credenciais cloud não configuradas | Baixa | Tests não rodam | Verificar .env |
| Seed lento | Baixa | CI demorado | Usar API batch |
| Dados persistentes entre runs | Baixa | Flaky tests | Cleanup em beforeEach |

## Success Criteria

- [ ] `pnpm test:e2e` executa localmente usando Supabase cloud
- [ ] `pnpm test:e2e:smoke` executa em < 5 minutos
- [ ] CI passa em todos os 3 browsers
- [ ] 0 flaky tests (exceto os marcados @slow)
- [ ] Relatório de testes publicado no GitHub PR

## Cronograma Estimado

| Fase | Tarefa | Tempo |
|------|--------|-------|
| 1 | ~~Configurar Supabase local~~ (removido) | 0h |
| 2 | Criar script de seed | 1h |
| 3 | Atualizar fixtures e setup | 1h |
| 4 | Configurar CI | 1h |
| 5 | Testar e ajustar | 2h |
| **Total** | | **5h** |