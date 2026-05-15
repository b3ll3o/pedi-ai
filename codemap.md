# Pedi-AI — Repository Atlas

> Cardápio Digital para Restaurantes (offline-first, multi-tenant)
>
> **Versão:** 1.2.0 | **Atualizado em:** 2026-05-06

## Project Responsibility

Pedi-AI é uma plataforma de cardápio digital que permite restaurantes gerenciarem seu menu, pedidos e mesas via QR code. O sistema opera em três frentes: **cliente** (navegação do cardápio, pedidos), **admin** (gestão de cardápio e pedidos) e **cozinha/garçom** (recebimento e acompanhamento de pedidos em tempo real).

### Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 + TypeScript + React 19 |
| Backend | Supabase (Auth, Database, Realtime, Storage) |
| Offline | Service Worker (Workbox) + IndexedDB (Dexie) |
| Estado | Zustand + React Query |
| Testes | Vitest (1427 testes, 1406 passing, 21 failing) + Playwright (32 specs E2E) |

---

## System Entry Points

| Rota | Descrição |
|------|-----------|
| `src/app/page.tsx` | Landing page (marketing) |
| `src/app/restaurantes/page.tsx` | Lista pública de restaurantes (delivery) |
| `src/app/restaurantes/[restaurantId]/cardapio/page.tsx` | Cardápio digital (cliente delivery) |
| `src/app/(customer)/menu/page.tsx` | Cardápio digital legado (redireciona para `/restaurantes`) |
| `src/app/admin/dashboard/page.tsx` | Painel administrativo |
| `src/app/admin/restaurants/page.tsx` | Gestão de restaurantes (multi-tenant) |
| `src/app/kitchen/page.tsx` | Display de cozinha |
| `src/app/(waiter)/dashboard/page.tsx` | Dashboard garçom |
| `src/middleware.ts` | Auth middleware — protege rotas admin |

### API Routes Públicas

| Rota | Descrição |
|------|-----------|
| `src/app/api/restaurants/route.ts` | GET — Lista restaurantes ativos |
| `src/app/api/restaurants/[id]/route.ts` | GET — Detalhes do restaurante |

---

## Directory Map

| Directory | Responsabilidade | Status | Mapa Detalhado |
|-----------|-----------------|--------|----------------|
| `src/app/` | Next.js App Router — todas as rotas, layouts, API routes | ✅ Atual | [Ver Map](src/app/codemap.md) |
| `src/domain/` | REGRAS DE NEGÓCIO - pure TypeScript, sem deps de framework | ✅ Implementado | Ver codemaps por domínio abaixo |
| `src/application/` | CASOS DE USO - orquestração | ✅ Implementado | Application services que coordinam domain + infrastructure |
| `src/infrastructure/` | IMPLEMENTAÇÕES - adapters, repos | ✅ Implementado | Repository implementations, Supabase adapter, QR code crypto |
| `src/components/` | Componentes React organizados por domínio | ✅ Atual | UI components (admin, cart, menu, order, payment, kitchen, restaurant) |
| `src/components/restaurant/` | Componentes de listagem pública (RestaurantSearch, RestaurantCard, RestaurantList) | ✅ Novo | Listagem de restaurantes para delivery |
| `src/hooks/` | Custom React hooks (useAuth, useRealtimeOrders, etc) | ✅ Atual | Reutilizáveis em toda a aplicação |
| `src/lib/` | Utilitários (auth, offline, QR, supabase, feature-flags) | ✅ Atual | Módulos reutilizáveis |
| `src/application/services/` | Lógica de negócio (adminOrderService, userService, etc) | ✅ DDD |antigamente em `src/services/`, migrado 2025-05-15 |
| `src/infrastructure/persistence/` | Zustand stores (cart, menu, restaurant, table) | ✅ DDD |antigamente em `src/stores/`, migrado 2025-05-15 |

### Domain Codemaps

Cada bounded context DDD possui seu próprio codemap:

| Bounded Context | Codemap | Status |
|-----------------|---------|--------|
| `admin/` | [Ver](src/domain/admin/codemap.md) | ✅ |
| `autenticacao/` | [Ver](src/domain/autenticacao/codemap.md) | ✅ |
| `cardapio/` | [Ver](src/domain/cardapio/codemap.md) | ✅ |
| `mesa/` | [Ver](src/domain/mesa/codemap.md) | ✅ |
| `pagamento/` | [Ver](src/domain/pagamento/codemap.md) | ✅ |
| `pedido/` | [Ver](src/domain/pedido/codemap.md) | ✅ |
| `shared/` | [Ver](src/domain/shared/codemap.md) | ✅ |

---

## Key Flows

### 1. Fluxo Cliente (Pedido)

```
Cliente escaneia QR code
  → Validação de mesa (src/lib/qr.ts)
  → Navega cardápio (src/app/(customer)/menu/)
  → Adiciona itens ao carrinho (src/infrastructure/persistence/cartStore.ts)
  → Checkout via Pix ou Stripe (src/components/payment/)
  → Pedido criado (src/application/pedido/services/CriarPedidoUseCase.ts)
  → Sincronização offline se sem conexão (src/lib/offline/)
```

### 2. Fluxo Admin (Gestão)

```
Admin faz login (src/lib/auth/)
  → Dashboard admin (src/app/admin/dashboard/)
  → Gerencia categorias, produtos, combos, modificadores (src/application/admin/services/)
  → Acompanha pedidos em tempo real (Supabase Realtime)
  → Atualiza status de pedidos
```

### 3. Fluxo Cozinha/Garçom

```
Cozinha recebe pedido via realtime (src/hooks/useRealtimeOrders.ts)
  → Atualiza status do pedido (pending → preparing → ready)
  → Garçom é notificado (src/infrastructure/persistence/tableStore.ts)
  → Entrega ao cliente
```

---

## OpenSpec

| Tipo | Localização |
|------|-------------|
| Specs de domínio | `openspec/specs/` (admin, auth, cart, menu, offline, order, payment, seo, table) |
| Changes arquivados | `openspec/changes/` (SDD artifacts) |

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
         │    Supabase     │
         │  (Auth + DB +  │
         │   Realtime)     │
         └─────────────────┘
```
