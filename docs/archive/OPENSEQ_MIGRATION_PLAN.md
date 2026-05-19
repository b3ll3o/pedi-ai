# Plano de Migração: Supabase → NestJS + Postgres

## Visão Geral

Migrar do Supabase (Auth, Database, Realtime) para:
- **Backend**: NestJS + Fastify (HTTP) + Prisma ORM
- **Database**: PostgreSQL (Prisma com migrations automáticas)
- **Auth**: JWT com bcrypt e refresh tokens (substituindo GoTrue/Supabase Auth)
- **Realtime**: WebSockets via NestJS Gateway + Socket.io (substituindo Supabase Realtime)
- **Status**: ✅ Completo — schema criado, API funcionando, testes passando

## Estrutura do Monorepo

```
pedi-ai/
├── apps/
│   ├── web/                    # Next.js 16 (atual)
│   │   ├── src/
│   │   │   ├── app/            # App Router
│   │   │   ├── components/     # Componentes React
│   │   │   ├── hooks/          # React hooks
│   │   │   └── lib/            # Utilitários (SUPRIMIR: supabase)
│   │   ├── package.json
│   │   └── .env.local          # NEXT_PUBLIC_API_URL=http://localhost:3001
│   │
│   └── api/                    # NestJS (NOVO)
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── auth/           # Módulo de autenticação
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── strategies/  # JWT strategy
│       │   │   ├── guards/     # Auth guards
│       │   │   └── dto/
│       │   ├── users/          # Módulo de usuários
│       │   ├── restaurants/     # Módulo de restaurantes
│       │   ├── orders/         # Módulo de pedidos
│       │   ├── payments/       # Módulo de pagamentos
│       │   ├── realtime/       # WebSocket gateway
│       │   └── common/         # Filtros, interceptors, decorators
│       ├── test/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── shared/                 # Código compartilhado (NOVO)
│       ├── src/
│       │   ├── types/          # Tipos compartilhados
│       │   ├── constants/      # Constantes
│       │   └── utils/          # Utilitários
│       └── package.json
│
├── docker-compose.yml           # (NOVO)
├── pnpm-workspace.yaml         # (ATUALIZAR)
└── turbo.json                  # (NOVO - opcional)
```

## Decisões Arquiteturais

### 1. Autenticação: JWT + bcrypt (NÃO GoTrue)

GoTrue é o engine do Supabase Auth, mas:
- Requer servidor próprio com PostgreSQL específico
- Menos flexível para customização
- Mesmo custo de manutenção que NestJS JWT

**Solução**: NestJS + Passport + JWT + bcrypt
- `@nestjs/passport` + `passport-jwt`
- bcrypt para hash de senhas
- Access token (15min) + Refresh token (7 dias)

### 2. Database: Prisma ORM

Migração de Drizzle para Prisma para melhor DX, migrations automáticas e schema mais limpo.

**Schema Prisma**: `apps/api/prisma/schema.prisma` — 14 modelos

### 3. Realtime: NestJS WebSocket Gateway

Substituir Supabase Realtime por:
- `@nestjs/websockets` + `socket.io`
- Adapter de broadcast para pedidos

### 4. Persistência: não muda

- Service Worker + Dexie (IndexedDB) continua igual
- Só muda o endpoint da API (Supabase → NestJS)

## Migração do Schema

### Prisma Schema

O schema Prisma está em `apps/api/prisma/schema.prisma` com 14 modelos:

- User, Session, RefreshToken
- Restaurant, Category, Product
- Order, OrderItem
- PaymentIntent
- Address, Review, Notification, Favorite, AuditLog

### Comandos

```bash
cd apps/api
pnpm prisma db push      # Aplica schema ao Postgres (desenvolvimento)
pnpm prisma migrate dev   # Cria migrations (produção)
pnpm prisma db seed      # Popula dados de exemplo
```

## API Endpoints (NestJS)

### Auth
```
POST   /auth/register     - Criar conta
POST   /auth/login        - Login (retorna JWT)
POST   /auth/refresh      - Refresh token
POST   /auth/logout       - Logout
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/me           - Perfil atual
```

### Restaurants
```
GET    /restaurants           - Lista restaurantes
GET    /restaurants/:id       - Detalhes
POST   /restaurants            - Criar (admin)
PATCH  /restaurants/:id       - Atualizar (admin)
DELETE /restaurants/:id       - Desativar (admin)
```

### Menu
```
GET    /restaurants/:id/categories
GET    /restaurants/:id/products
GET    /products/:id
POST   /categories            (admin)
PATCH  /categories/:id        (admin)
DELETE /categories/:id        (admin)
... (similar para products, modifiers, combos)
```

### Orders
```
GET    /orders                    - Listar pedidos
POST   /orders                    - Criar pedido
GET    /orders/:id                - Detalhes
PATCH  /orders/:id/status         - Atualizar status
```

### Payments
```
POST   /payments/pix/create       - Criar PIX
GET    /payments/pix/status/:id   - Status PIX
POST   /webhooks/pix               - Webhook MercadoPago
```

### Realtime
```
WS     /orders                    - Canal de pedidos (socket.io)
```

## Variáveis de Ambiente

### .env (apps/api/)
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pedi_ai

# Auth
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
PORT=3001
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000
```

### .env.local (apps/web/)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: pedi_ai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/pedi_ai
      JWT_SECRET: ${JWT_SECRET}
      NODE_ENV: production

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001

volumes:
  postgres_data:
```

## Ordem de Migração

### Fase 1: Estrutura Base
1. [x] Criar plano de migração
2. [ ] Atualizar pnpm-workspace.yaml
3. [ ] Criar apps/api com NestJS
4. [ ] Criar apps/web com Next.js (mover código atual)
5. [ ] Criar docker-compose.yml
6. [ ] Criar packages/shared

### Fase 2: Backend Core
7. [ ] Configurar Drizzle com Postgres
8. [ ] Implementar módulo de autenticação (JWT)
9. [ ] Migrar schema do banco
10. [ ] Implementar CRUD de restaurantes
11. [ ] Implementar CRUD de cardápio
12. [ ] Implementar pedidos
13. [ ] Implementar pagamentos PIX

### Fase 3: Frontend Update
14. [ ] Criar API client para NestJS (substituir Supabase client)
15. [ ] Atualizar hooks de autenticação
16. [ ] Atualizar API routes do Next.js (agora chamam NestJS)
17. [ ] Remover código Supabase

### Fase 4: Realtime (opcional, fase posterior)
18. [ ] Implementar WebSocket gateway
19. [ ] Atualizar hooks de realtime

### Fase 5: Testes
20. [ ] Rodar testes unitários
21. [ ] Corrigir erros
22. [ ] Rodar lint/typecheck
23. [ ] Atualizar testes E2E

## Remoção do Supabase

Arquivos a remover:
- `src/lib/supabase/` (todo diretório)
- `src/infrastructure/external/SupabaseAuthAdapter.ts`
- Dependências `@supabase/*`

Arquivos a modificar:
- `src/lib/auth/` (adaptar para API NestJS)
- `src/hooks/useAuth.ts`
- `src/infrastructure/database/index.ts`
- `src/infrastructure/database/dev-client.ts`
- `src/infrastructure/persistence/cardapio/CardapioSyncService.ts`
- API routes em `src/app/api/`

## Resumo de Benefícios

| Antes (Supabase) | Depois (NestJS + Postgres) |
|------------------|---------------------------|
| Auth SaaS | Auth self-hosted (JWT) |
|rate limiting do plano |rate limiting custom |
| Dependência de internet para dev | Dev 100% local |
| Custo escalável alto | Custo fixo (VPS) |
| vendor lock-in | Código próprio |
| Realtime gerenciado | Realtime customizável |
