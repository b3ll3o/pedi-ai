# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto

**Pedi-AI** — Cardápio Digital para restaurantes com foco em mobile-first e offline-first.

Stack: Next.js 16 + React 19 (web), NestJS + Fastify + Prisma + PostgreSQL (api).

---

## Commands

```bash
# Development
pnpm dev              # Next.js :3000 + API :3001
pnpm build            # Production build
pnpm lint             # ESLint

# Unit tests (apps/web: 205 files, 2388 testes)
pnpm test             # All unit tests
pnpm test:watch       # Watch mode
pnpm test:coverage     # With coverage report
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only
pnpm test:ui          # Vitest UI

# E2E tests (requires docker-compose up)
pnpm test:e2e:seed     # Seed test data
pnpm test:e2e          # Run E2E (Chromium headless)
pnpm test:e2e:ui       # E2E with UI
pnpm test:e2e:smoke    # Smoke tests only
pnpm test:e2e:critical # Critical path tests
pnpm test:e2e:fast     # Fast tests (excludes @slow, @webhook)
pnpm test:e2e:cleanup  # Cleanup E2E test data
pnpm test:e2e:all      # All E2E tests with UI
pnpm test:e2e:shard:auth     # Auth E2E shard
pnpm test:e2e:shard:customer # Customer E2E shard
pnpm test:e2e:shard:admin   # Admin E2E shard

# API tests
pnpm --filter @pedi-ai/api test
pnpm --filter @pedi-ai/api test:coverage

# Infrastructure
docker-compose -f docker-compose.dev.yml up -d  # Dev: PostgreSQL + Mailpit + API + Web + Nginx (hot reload)
pnpm mailpit          # Start Mailpit SMTP mock (ports 1025, 8025)

# Database
pnpm db:seed          # Seed development database
pnpm prisma db push   # Apply schema (from apps/api/)
```

---

## Arquitetura

### Monorepo Structure

```
pedi-ai/
├── apps/
│   ├── api/           # NestJS + Prisma + PostgreSQL (ports 3001)
│   └── web/           # Next.js 16 (port 3000)
├── packages/
│   └── shared/        # Shared constants, utils (no framework deps)
└── docs/              # Architecture guides
```

### DDD Layers (apps/web)

Camadas em ordem de dependência (domain é o centro, sem dependências externas):

```
domain/          → Puro TypeScript. Entidades, VOs, aggregates, events, serviços,
│                  interfaces de repositório. ZERO dependências de React/Next.
application/     → Use cases. Depende apenas de domain + interfaces.
infrastructure/  → Implementações: Dexie (IndexedDB), adapters externos (JWT, PIX).
presentation/    → Next.js: app/, components/, hooks/.
```

### Bounded Contexts (domain layer)

| Contexto        | Descrição                                               |
| --------------- | ------------------------------------------------------- |
| `pedido/`       | Pedidos, carrinho, cálculo de totais                    |
| `cardapio/`     | Catálogo de produtos, categorias, combos, modificadores |
| `mesa/`         | Mesas e validação de QR codes                           |
| `pagamento/`    | Processamento PIX via Mercado Pago                      |
| `autenticacao/` | Usuários, sessões, papéis                               |
| `admin/`        | Restaurantes, vínculo usuário-restaurante               |

### Dependency Rules

- `domain/` → nada (é puro)
- `application/` → domain + interfaces (não implementações)
- `infrastructure/` → domain (implementa interfaces)
- `presentation/` → application + domain (types)

### apps/api Status

Migração DDD **em andamento**. Estrutura de diretórios criada (`domain/`, `application/`, `infrastructure/`, `presentation/`) com bounded contexts (admin/, autenticacao/, cardapio/, mesa/, pagamento/, pedido/, shared/). Módulos legados (auth/, orders/, payments/, restaurants/, users/) ainda coexistem. Ver `docs/guides/DDD_MIGRACAO_API.md`.

---

## Padrões Importantes

### Value Objects

`Dinheiro` armazena valores em **centavos** (number) para evitar problemas de ponto flutuante:

```typescript
const valor = Dinheiro.criar(1500); // R$ 15,00
valor.reais; // 15
valor.valor; // 1500 (centavos)
```

### QR Code de Mesa

Validação usa **HMAC-SHA256**. Implementação em `apps/web/src/lib/qr/validator.ts`. QR code contém `restauranteId`, `mesaId` e `assinatura`.

### Offline-First

- Service Worker (Workbox) para cache de assets
- IndexedDB (Dexie) para persistência local via `PediDatabase`
- Pedidos offline são enfileirados e syncados ao reconectar

---

## Feature Flags

Sistema de feature flags **runtime, DB-backed** com overrides por escopo
(GLOBAL/RESTAURANT/USER) e propagação por polling 30 s no front. Hospedado
no BC `admin`. Guia operacional em
[`docs/guides/FEATURE_FLAGS.md`](./docs/guides/FEATURE_FLAGS.md). Spec em
[`.openspec/specs/admin/design.md §2.1`](./.openspec/specs/admin/design.md).

**Compatibilidade legada:** as variáveis abaixo em `.env.local` ainda são
lidas por `apps/web/src/lib/feature-flags.ts` como fallback quando o SDK
não consegue consultar o DB (`RNF-AVAIL-FF-01`).

| Flag                                    | Descrição                                    |
| --------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED`   | Modo offline                                 |
| `NEXT_PUBLIC_FEATURE_PIX_ENABLED`       | Pagamento PIX                                |
| `NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED`   | QR codes de mesa                             |
| `NEXT_PUBLIC_FEATURE_COMBOS_ENABLED`    | Sistema de combos                            |
| `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT`   | Multi-restaurante (ver RF-ADM-09, planejado) |
| `NEXT_PUBLIC_FEATURE_WAITER_MODE`       | Sistema de chamada garçom                    |
| `NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED` | Dashboard de analytics                       |
| `NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED`  | Cashback (planejado, sem RF atual)           |

**Como consumir no front (Next.js + React):**

```tsx
import { useFeatureFlag } from '@/infrastructure/feature-flags';

const pixHabilitado = useFeatureFlag<boolean>('pix_enabled', false);
```

---

## Regras do Projeto

De `AGENTS.md`:

- **Idioma**: Todo código, UI e documentação em **português brasileiro (pt-BR)**
- **Mobile-first**: Desenvolver para mobile primeiro, escalar para desktop
- **CSS**: Usar `rem` para tamanhos e espaçamento (exceto valores < 4px, bordas)
- **Cobertura mínima**: 80% para testes unitários
- **Testes E2E**: Devem ser atualizados quando funcionalidade mudar

---

## Database Schema (Prisma)

Tabelas principais em `apps/api/prisma/schema.prisma`:

- `restaurants` — Multi-tenant
- `tables` — Mesas com QR Code
- `categories` / `products` / `modifier_groups` / `modifier_values`
- `combos` / `combo_items`
- `orders` / `order_items` / `order_status_history`
- `users_profiles` — Perfis (owner/manager/staff)
- `WebhookEvent` — Idempotência de webhooks
- `PasswordResetToken` — Recuperação de senha
- `Subscription` — Gestão de assinaturas

---

## Key Files

- `AGENTS.md` — Regras completas do projeto
- `docs/guides/ARCHITECTURE.md` — Arquitetura DDD detalhada
- `docs/guides/OFFLINE.md` — Offline-first
- `docs/guides/PAYMENTS.md` — PIX/Mercado Pago
- `codemap.md` — Mapa completo do código
