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

# Unit tests (apps/web: 116 files, 1441 tests)
pnpm test             # All unit tests
pnpm test:watch       # Watch mode
pnpm test:coverage     # With coverage report
pnpm test:unit         # Unit tests only
pnpm test:integration  # Integration tests only

# E2E tests (requires docker-compose up)
pnpm test:e2e:seed     # Seed test data
pnpm test:e2e          # Run E2E (Chromium headless)
pnpm test:e2e:ui       # E2E with UI
pnpm test:e2e:smoke    # Smoke tests only
pnpm test:e2e:critical # Critical path tests
pnpm test:e2e:fast     # Fast tests (excludes @slow, @webhook)

# API tests
pnpm --filter @pedi-ai/api test
pnpm --filter @pedi-ai/api test:coverage

# Infrastructure
docker-compose up -d  # Start PostgreSQL + Mailpit
pnpm mailpit          # Start Mailpit SMTP mock (ports 1025, 8025)

# Database
pnpm db:seed          # Seed development database
cd apps/api && pnpm prisma db push  # Apply schema
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

| Contexto | Descrição |
|----------|-----------|
| `pedido/` | Pedidos, carrinho, cálculo de totais |
| `cardapio/` | Catálogo de produtos, categorias, combos, modificadores |
| `mesa/` | Mesas e validação de QR codes |
| `pagamento/` | Processamento PIX via Mercado Pago |
| `autenticacao/` | Usuários, sessões, papéis |
| `admin/` | Restaurantes, vínculo usuário-restaurante |

### Dependency Rules

- `domain/` → nada (é puro)
- `application/` → domain + interfaces (não implementações)
- `infrastructure/` → domain (implementa interfaces)
- `presentation/` → application + domain (types)

### apps/api Status

O `apps/api` ainda NÃO segue estrutura DDD completa. Usa módulos tradicionais (auth/, orders/, payments/, restaurants/, users/) que precisam ser reorganizados.

---

## Padrões Importantes

### Value Objects

`Dinheiro` armazena valores em **centavos** (number) para evitar problemas de ponto flutuante:

```typescript
const valor = Dinheiro.criar(1500); // R$ 15,00
valor.reais  // 15
valor.valor  // 1500 (centavos)
```

### QR Code de Mesa

Validação usa **HMAC-SHA256**. Assinatura gerada em `domain/mesa/services/QRCodeValidationService.ts`. QR code contém `restauranteId`, `mesaId` e `assinatura`.

### Offline-First

- Service Worker (Workbox) para cache de assets
- IndexedDB (Dexie) para persistência local via `PediDatabase`
- Pedidos offline são enfileirados e syncados ao reconectar

---

## Feature Flags

Flags configuradas via variáveis de ambiente em `.env.local`:

| Flag | Descrição |
|------|-----------|
| `NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED` | Modo offline |
| `NEXT_PUBLIC_FEATURE_PIX_ENABLED` | Pagamento PIX |
| `NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED` | QR codes de mesa |
| `NEXT_PUBLIC_FEATURE_COMBOS_ENABLED` | Sistema de combos |
| `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT` | Multi-restaurante |

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
- `webhook_events` — Idempotência de webhooks

---

## Key Files

- `AGENTS.md` — Regras completas do projeto
- `docs/guides/ARCHITECTURE.md` — Arquitetura DDD detalhada
- `docs/guides/OFFLINE.md` — Offline-first
- `docs/guides/PAYMENTS.md` — PIX/Mercado Pago
- `codemap.md` — Mapa completo do código