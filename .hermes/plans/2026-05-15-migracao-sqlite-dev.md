# Plano: SQLite Local para Dev + Supabase para Prod

> **Data:** 2026-05-15
> **Projeto:** pedi-ai
> **Problema:** Rate limiting do Supabase em desenvolvimento local
> **Solução:** SQLite local em dev, Supabase continua em prod

---

## Diagnóstico Atual

```
Supabase usado em:
├── src/lib/supabase/     → auth, client, types, storage, server, middleware
├── src/app/api/          → menu, restaurantes, webhooks/pix, auth/*, admin/*
├── src/app/admin/*       → getSession() em todas as páginas
└── src/infrastructure/persistence/ → repositories (cardapio, pedido, mesa, pagamento)
```

**O problema:** Em dev local, toda requisição vai para o Supabase → rate limiting do plano free.

**A solução:** Camada de abstração que aponta para SQLite local em dev e Supabase em prod.

---

## Arquitetura Proposta

```
                    ┌─────────────────────────────────────────┐
                    │         Application Layer               │
                    │    (use cases, business logic)           │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │      Infrastructure Layer                │
                    │  ┌─────────────┐    ┌─────────────────┐  │
                    │  │ Repositories │    │ Database Adapter │  │
                    │  │  (interfaces)│    │  (implementação)  │  │
                    │  └─────────────┘    └────────┬────────┘  │
                    └─────────────────────────────┼────────────┘
                                                  │
                         DEV ◄───────────────────┼────────────────► PROD
                         │                       │                 │
                    ┌────▼────┐            ┌─────▼─────┐
                    │ SQLite  │            │ Supabase  │
                    │(local)  │            │ (cloud)   │
                    └─────────┘            └───────────┘
```

**Regra:** O `domain/` e `application/` **nunca** importam Supabase diretamente.

---

## Etapa 1: Instalar dependências SQLite

```bash
pnpm add drizzle-orm better-sqlite3
pnpm add -D drizzle-kit @types/better-sqlite3
```

**Nota:** `better-sqlite3` é síncrono (melhor performance), mas blocking. Para Next.js API routes isso é fine porque roda em Edge/compute isolado.

---

## Etapa 2: Criar schema Drizzle (espelho do Supabase)

**Novo arquivo:** `src/infrastructure/database/schema.ts`

Criar schemas para todas as tabelas que existem no Supabase:
- `restaurants`
- `categories`
- `products`
- `modifier_groups`
- `modifier_values`
- `combos` / `combo_items`
- `tables`
- `orders`
- `order_items`
- `payments`
- `transactions`
- `users_profiles`

**Importante:** Manter os mesmos nomes de colunas e tipos do Supabase para facilitar migração.

---

## Etapa 3: Criar camada de abstração (Repository Pattern)

**Arquivo:** `src/infrastructure/database/client.ts`

```typescript
// Abstração que esconde se é SQLite ou Supabase
export interface DatabaseClient {
  // Auth
  auth: { getSession(): Promise<Session | null>; signIn(email, pass): Promise<...>; signOut(): Promise<void> }
  // Queries
  from(table: string): QueryBuilder
  // Storage
  storage: { upload(bucket, path, file): Promise<string>; download(...): Promise<ArrayBuffer> }
}
```

**Implementações:**
- `src/infrastructure/database/dev-client.ts` → SQLite (dev local)
- `src/infrastructure/database/supabase-client.ts` → Supabase (prod)

**Seletor por env:**
```typescript
// src/infrastructure/database/index.ts
import { isDev } from '@/lib/feature-flags'
export const db = isDev ? devDbClient : supabaseClient
```

---

## Etapa 4: Migrar API Routes para usar abstração

**Arquivos a alterar** (13 API routes):

```
src/app/api/
├── menu/route.ts                    → usa abstração
├── restaurantes/[slug]/route.ts      → usa abstração
├── restaurantes/[slug]/cardapio/     → usa abstração
├── mesas/validar/route.ts            → usa abstração
├── auth/register/route.ts            → JWT local em dev
├── auth/profile/route.ts             → usa abstração
├── auth/reset-password/route.ts      → local ou ignora
├── admin/subscriptions/route.ts       → usa abstração
└── webhooks/pix/route.ts             → MANTÉM Supabase (Pix precisa de webhook externo)
```

**Estratégia:** API routes não usam mais `createClient()` diretamente. Usam `db` que é injetado.

---

## Etapa 5: Migrar Auth

**Problema:** Auth é o mais tricky porque Supabase Auth não tem "modo local".

**Solução para dev:**

```
DEV:  JWT simples com `jose` + seed de usuários no SQLite
PROD: Supabase Auth
```

```typescript
// src/infrastructure/database/dev-auth.ts
// Seed com 1 admin e usuários de teste no SQLite
// Usa JWT (jose) para sessões
// Mesma interface: getSession(), signIn(), signOut()
```

**Arquivos a alterar:**
- `src/lib/supabase/auth.ts` → envolver com abstração
- `src/middleware.ts` → detectar dev vs prod, validar JWT local ou Supabase

---

## Etapa 6: Migrar Repositories em `infrastructure/persistence/`

Os repositories já têm interface defined no domain. Apenas trocar a implementação:

```
src/infrastructure/persistence/
├── cardapio/
│   ├── CategoriaRepository.ts    → SQLite
│   ├── ItemCardapioRepository.ts → SQLite
│   └── ModificadorGrupoRepository.ts → SQLite
├── mesa/
│   └── MesaRepository.ts         → SQLite
├── pedido/
│   ├── PedidoRepository.ts        → SQLite
│   └── CarrinhoRepository.ts      → SQLite (Dexie existing)
├── pagamento/
│   ├── PagamentoRepository.ts     → SQLite
│   └── TransacaoRepository.ts     → SQLite
```

---

## Etapa 7: Seed database local

**Arquivo:** `scripts/seed-dev-db.ts`

Executar via CLI para popular SQLite com dados de exemplo:
- 2-3 restaurantes
- 5-10 categorias
- 20-30 produtos
- 5 mesas por restaurante
- 1 adminuser (admin@pedi.ai / admin123)

---

## Etapa 8: Configuração de ambiente

```env
# .env.local (NÃO commitar)
DATABASE_PROVIDER=sqlite          # ou "supabase"
DATABASE_URL=./data/pedi-ai.db
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# .env.example (commitar, sem segredos)
DATABASE_PROVIDER=sqlite
```

---

## Etapa 9: Testar tudo

```bash
# Verificar TypeScript
pnpm tsc --noEmit

# Rodar lint
pnpm lint

# Testes unitários (os 1427 existentes não devem quebrar)
pnpm test

# Seed do banco
pnpm db:seed

# Iniciar dev server
pnpm dev
```

---

## Ordem de Execução (Tarefas)

| # | Tarefa | Prioridade | Risco |
|---|--------|-----------|-------|
| 1 | Instalar dependências SQLite | ⬛⬛⬛⬛⬛ | Baixo |
| 2 | Criar schema Drizzle | ⬛⬛⬛⬛ | Médio |
| 3 | Criar DatabaseClient abstraction | ⬛⬛⬛ | Alto |
| 4 | Criar DevDatabaseClient (SQLite) | ⬛⬛⬛⬛ | Alto |
| 5 | Criar DevAuth (JWT local) | ⬛⬛⬛ | Alto |
| 6 | Migrar API routes | ⬛⬛⬛ | Médio |
| 7 | Migrar repositories | ⬛⬛⬛ | Médio |
| 8 | Seed script | ⬛⬛ | Baixo |
| 9 | Config env vars | ⬛⬛ | Baixo |
| 10 | Testar full stack | ⬛⬛⬛ | Médio |

---

## rollback

Se algo falhar, basta setar `DATABASE_PROVIDER=supabase` e todas as APIs voltam a usar Supabase diretamente. Zero breaking change em prod.

---

## Estimativa

- **Tempo:** 4-6h de trabalho
- **Testes quebrados:** ~0 (abstração preserva interfaces)
- **Impacto em prod:** Zero (supabase continua igual)
