# Migração do Supabase/Drizzle para PostgreSQL Nativo

> Criado em: 2025-05-16
> Atualizado em: 2026-05-22
> Status: **✅ COMPLETA**

---

## Resumo da Migração

Migração do Supabase (Auth, Database, Realtime) para:

- **Backend**: NestJS + Fastify + Prisma ORM + PostgreSQL
- **Auth**: JWT com bcrypt (PostgresAuthAdapter)
- **Realtime**: WebSockets via NestJS Gateway + Socket.io

---

## O que foi feito

### Fase 1: Limpeza do código Supabase/Drizzle

- [x] `apps/web/src/lib/supabase/` removido
- [x] `apps/web/src/infrastructure/database/` (antigo) removido
- [x] `drizzle-orm`, `better-sqlite3` removidos do `package.json`
- [x] `DATABASE_PROVIDER`, `isDevDatabase()` removidos de todos os arquivos
- [x] `pg-client.ts` criado (PostgreSQL nativo via `postgres.js`)
- [x] `PostgresAuthAdapter` implementado substituindo `SupabaseAuthAdapter`
- [x] Todas as 45 rotas API reescritas para usar PostgreSQL diretamente

### Fase 2: Unificação

- [x] `apps/web` e `apps/api` usam o mesmo PostgreSQL
- [x] Auth migrado para JWT nativo com bcrypt

### Fase 3: Build Docker

- [x] `docker compose build` funcionando
- [x] `docker compose up` completo com healthchecks

---

## Estado Atual do Projeto

### Stack de Banco (ATUAL)

| Componente                             | Tecnologia                               |
| -------------------------------------- | ---------------------------------------- |
| API Routes (`apps/web/src/app/api/**`) | PostgreSQL via `postgres.js`             |
| API NestJS (`apps/api/`)               | Prisma + PostgreSQL                      |
| Auth                                   | JWT com bcrypt via `PostgresAuthAdapter` |

### Estrutura do Monorepo

```
pedi-ai/
├── apps/
│   ├── api/          # NestJS + Prisma + PostgreSQL (admin dashboard, websocket)
│   └── web/          # Next.js 16 + TypeScript (cardápio digital)
│       └── src/
│           └── infrastructure/
│               ├── database/pg-client.ts    # PostgreSQL nativo
│               └── external/PostgresAuthAdapter.ts  # Auth JWT
├── packages/
│   └── shared/       # Código compartilhado
├── docker-compose.yml
└── docs/
```

---

## Variáveis de Ambiente

### apps/web/.env.local

```env
# API (NestJS)
NEXT_PUBLIC_API_URL=http://localhost:3001
API_JWT_SECRET=seu_jwt_secret_minimo_32_chars

# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pedi_ai

# Mercado Pago (PIX)
MERCADO_PAGO_ACCESS_TOKEN=seu_token
MP_WEBHOOK_SECRET=seu_webhook_secret

# QR Code
QR_SECRET_KEY=sua_chave_secreta_para_hmac

# Feature Flags
NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED=true
NEXT_PUBLIC_FEATURE_PIX_ENABLED=true
```

---

## Comandos para Iniciar

```bash
# 1. Subir infraestrutura com Docker
docker-compose up -d

# 2. Aplicar schema e seed
cd apps/api
pnpm prisma db push
pnpm db:seed

# 3. Rodar em desenvolvimento
pnpm dev  # Next.js :3000 + API :3001
```

---

## Status Final

```
[X] Supabase/Drizzle removido
[X] PostgreSQL nativo configurado (postgres.js)
[X] PostgresAuthAdapter implementado
[X] Todas as 45 rotas API migradas
[X] Auth JWT migrado
[X] Docker build funcionando
[X] docker compose up completo
```

---

## Arquivos de Referência

- Schema Prisma: `apps/api/prisma/schema.prisma`
- pg-client: `apps/web/src/infrastructure/database/pg-client.ts`
- PostgresAuthAdapter: `apps/web/src/infrastructure/external/PostgresAuthAdapter.ts`
- docker-compose.yml: configuração completa do ambiente
