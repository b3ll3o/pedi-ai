# Pedi-AI — Repository Atlas

> Cardápio Digital para Restaurantes (offline-first, multi-tenant)
>
> **Versão:** 1.4.0 | **Atualizado em:** 2026-05-16 | **Monorepo:** pnpm workspaces

## Project Responsibility

Pedi-AI é uma plataforma de cardápio digital que permite restaurantes gerenciarem seu menu, pedidos e mesas via QR code. O sistema opera em três frentes: **cliente** (navegação do cardápio, pedidos), **admin** (gestão de cardápio e pedidos) e **cozinha/garçom** (recebimento e acompanhamento de pedidos em tempo real).

### Tech Stack

| Camada   | Tecnologia                                       |
| -------- | ------------------------------------------------ |
| Frontend | Next.js 16 + TypeScript + React 19               |
| Backend  | NestJS + Fastify + Prisma ORM + PostgreSQL       |
| Offline  | Service Worker (Workbox) + IndexedDB (Dexie)     |
| Estado   | Zustand + React Query                            |
| Testes   | Vitest (1523 testes) + Playwright (19 specs E2E) |

---

## System Entry Points

| Rota                                                             | Descrição                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `apps/web/src/app/page.tsx`                                      | Landing page (marketing)                                   |
| `apps/web/src/app/restaurantes/page.tsx`                         | Lista pública de restaurantes (delivery)                   |
| `apps/web/src/app/restaurantes/[restaurantId]/cardapio/page.tsx` | Cardápio digital (cliente delivery)                        |
| `apps/web/src/app/(customer)/menu/page.tsx`                      | Cardápio digital legado (redireciona para `/restaurantes`) |
| `apps/web/src/app/admin/dashboard/page.tsx`                      | Painel administrativo                                      |
| `apps/web/src/app/admin/restaurants/page.tsx`                    | Gestão de restaurantes (multi-tenant)                      |
| `apps/web/src/app/kitchen/page.tsx`                              | Display de cozinha                                         |
| `apps/web/src/app/(waiter)/dashboard/page.tsx`                   | Dashboard garçom                                           |

### API Routes Públicas

| Rota                                             | Descrição                       |
| ------------------------------------------------ | ------------------------------- |
| `apps/web/src/app/api/restaurants/route.ts`      | GET — Lista restaurantes ativos |
| `apps/web/src/app/api/restaurants/[id]/route.ts` | GET — Detalhes do restaurante   |

---

## Monorepo Structure

```
pedi-ai/
├── apps/
│   ├── api/       # NestJS backend (admin, orders, realtime websocket)
│   └── web/      # Next.js frontend (cardápio digital, cliente)
│       ├── public/  # Arquivos estáticos (sw.js, manifest, robots.txt)
│       └── tests/   # Vitest + Playwright
├── packages/
│   └── shared/   # Código compartilhado (@pedi-ai/shared)
└── docs/          # Documentação
```

## Directory Map

| Directory                                  | Responsabilidade                                                                   | Status          | Mapa Detalhado                                                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------- |
| `apps/web/src/app/`                        | Next.js App Router — todas as rotas, layouts, API routes                           | ✅ Atual        | [Ver Map](apps/web/src/app/codemap.md)                                 |
| `apps/web/src/domain/`                     | REGRAS DE NEGÓCIO - pure TypeScript, sem deps de framework                         | ✅ Implementado | Ver codemaps por domínio abaixo                                        |
| `apps/web/src/application/`                | CASOS DE USO - orquestração                                                        | ✅ Implementado | Application services que coordinam domain + infrastructure             |
| `apps/web/src/infrastructure/`             | IMPLEMENTAÇÕES - adapters, repos                                                   | ✅ Implementado | Repository implementations, API client, QR code crypto                 |
| `apps/web/src/components/`                 | Componentes React organizados por domínio                                          | ✅ Atual        | UI components (admin, cart, menu, order, payment, kitchen, restaurant) |
| `apps/web/src/components/restaurant/`      | Componentes de listagem pública (RestaurantSearch, RestaurantCard, RestaurantList) | ✅ Novo         | Listagem de restaurantes para delivery                                 |
| `apps/web/src/hooks/`                      | Custom React hooks (useAuth, useRealtimeOrders, etc)                               | ✅ Atual        | Reutilizáveis em toda a aplicação                                      |
| `apps/web/src/lib/`                        | Utilitários (auth, offline, QR, api-client, feature-flags)                         | ✅ Atual        | Módulos reutilizáveis                                                  |
| `apps/web/src/application/services/`       | Lógica de negócio (adminOrderService, userService, etc)                            | ✅ DDD          | antigamente em `apps/web/src/services/`, migrado 2025-05-15            |
| `apps/web/src/infrastructure/persistence/` | Zustand stores (cart, menu, restaurant, table)                                     | ✅ DDD          | antigamente em `apps/web/src/stores/`, migrado 2025-05-15              |

### Domain Codemaps

Cada bounded context DDD possui seu próprio codemap:

| Bounded Context | Codemap                                            | Status |
| --------------- | -------------------------------------------------- | ------ |
| `admin/`        | [Ver](apps/web/src/domain/admin/codemap.md)        | ✅     |
| `autenticacao/` | [Ver](apps/web/src/domain/autenticacao/codemap.md) | ✅     |
| `cardapio/`     | [Ver](apps/web/src/domain/cardapio/codemap.md)     | ✅     |
| `mesa/`         | [Ver](apps/web/src/domain/mesa/codemap.md)         | ✅     |
| `pagamento/`    | [Ver](apps/web/src/domain/pagamento/codemap.md)    | ✅     |
| `pedido/`       | [Ver](apps/web/src/domain/pedido/codemap.md)       | ✅     |
| `shared/`       | [Ver](apps/web/src/domain/shared/codemap.md)       | ✅     |

---

## Key Flows

### 1. Fluxo Cliente (Pedido)

```
Cliente escaneia QR code
  → Validação de mesa (apps/web/src/lib/qr.ts)
  → Navega cardápio (apps/web/src/app/(customer)/menu/)
  → Adiciona itens ao carrinho (apps/web/src/infrastructure/persistence/cartStore.ts)
  → Checkout via Pix ou Stripe (apps/web/src/components/payment/)
  → Pedido criado (apps/web/src/application/pedido/services/CriarPedidoUseCase.ts)
  → Sincronização offline se sem conexão (apps/web/src/lib/offline/)
```

### 2. Fluxo Admin (Gestão)

```
Admin faz login (apps/web/src/lib/auth/)
  → Dashboard admin (apps/web/src/app/admin/dashboard/)
  → Gerencia categorias, produtos, combos, modificadores (apps/web/src/application/admin/services/)
  → Acompanha pedidos em tempo real (WebSocket Gateway + Socket.io)
  → Atualiza status de pedidos
```

### 3. Fluxo Cozinha/Garçom

```
Cozinha recebe pedido via realtime (apps/web/src/hooks/useRealtimeOrders.ts)
  → Atualiza status do pedido (pending → preparing → ready)
  → Garçom é notificado (apps/web/src/infrastructure/persistence/tableStore.ts)
  → Entrega ao cliente
```

---


## Arquitetura de Dados Offline

```
┌─────────────────┐     ┌─────────────────────────────┐
│   Dexie (IDB)   │────▶│   Zustand (infrastructure/) │
│  - menus        │     │  - cartStore               │
│  - orders       │     │  - menuStore               │
│  - tables       │     │  - tableStore              │
└─────────────────┘     └─────────────────────────────┘
         │                     │
         ▼                     ▼
┌─────────────────────────────────────┐
│      Service Worker (Workbox)       │
│  - Cache de assets estáticos        │
│  - Background sync para pedidos     │
└─────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │   NestJS API    │
         │  (Fastify +    │
         │   Prisma +     │
         │  Socket.io)    │
         └─────────────────┘
```
