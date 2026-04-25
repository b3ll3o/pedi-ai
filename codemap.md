# Pedi-AI — Repository Atlas

> Cardápio Digital para Restaurantes (offline-first, multi-tenant)
>
> **Versão:** 1.0.0 | **Atualizado em:** 2026-04-24

## Project Responsibility

Pedi-AI é uma plataforma de cardápio digital que permite restaurantes gerenciarem seu menu, pedidos e mesas via QR code. O sistema opera em três frentes: **cliente** (navegação do cardápio, pedidos), **admin** (gestão de cardápio e pedidos) e **cozinha/garçom** (recebimento e acompanhamento de pedidos em tempo real).

### Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | Next.js 16 + TypeScript + React 19 |
| Backend | Supabase (Auth, Database, Realtime, Storage) |
| Offline | Service Worker (Workbox) + IndexedDB (Dexie) |
| Estado | Zustand + React Query |
| Testes | Vitest (607 testes, 97.91% cobertura) + Playwright (17 specs E2E) |

---

## System Entry Points

| Rota | Descrição |
|------|-----------|
| `src/app/page.tsx` | Landing page (marketing) |
| `src/app/(customer)/menu/page.tsx` | Cardápio digital (cliente) |
| `src/app/admin/dashboard/page.tsx` | Painel administrativo |
| `src/app/kitchen/page.tsx` | Display de cozinha |
| `src/app/(waiter)/dashboard/page.tsx` | Dashboard garçom |
| `src/middleware.ts` | Auth middleware — protege rotas admin |

---

## Directory Map

| Directory | Responsabilidade | Status | Mapa Detalhado |
|-----------|-----------------|--------|----------------|
| `src/app/` | Next.js App Router — todas as rotas, layouts, API routes | ✅ Atual | [Ver Map](src/app/codemap.md) |
| `src/components/` | Componentes React organizados por domínio (UI layer) | ✅ Atual | [Ver Map](src/components/codemap.md) |
| `src/hooks/` | Custom React hooks — auth, menu, realtime, table, role | ✅ Atual | [Ver Map](src/hooks/codemap.md) |
| `src/lib/` | Módulos reutilizáveis — auth, offline (Dexie), QR, Supabase client, SW | ✅ Atual | [Ver Map](src/lib/codemap.md) |
| `src/services/` | Business logic layer — orders, users, tables, analytics | ✅ Atual | [Ver Map](src/services/codemap.md) |
| `src/stores/` | Zustand state management — menu, cart, table com persistência offline | ✅ Atual | [Ver Map](src/stores/codemap.md) |
| `src/domain/` | REGRAS DE NEGÓCIO - pure TypeScript, sem deps de framework | 🚧 Planejado | [Ver Mapa](openspec/changes/implantacao-ddd/design.md) |
| `src/application/` | CASOS DE USO - orquestração | 🚧 Planejado | [Ver Mapa](openspec/changes/implantacao-ddd/design.md) |
| `src/infrastructure/` | IMPLEMENTAÇÕES - adapters, repos | 🚧 Planejado | [Ver Mapa](openspec/changes/implantacao-ddd/design.md) |
| `src/presentation/` | NEXT.JS - UI, API routes | 🚧 Planejado | [Ver Mapa](openspec/changes/implantacao-ddd/design.md) |

> **Nota**: A estrutura DDD (`domain/`, `application/`, `infrastructure/`, `presentation/`) está **planejada** mas **não foi implementada**. Voir `openspec/changes/implantacao-ddd/` para o plano de migração.

---

## Key Flows

### 1. Fluxo Cliente (Pedido)

```
Cliente escaneia QR code
  → Validação de mesa (src/lib/qr.ts)
  → Navega cardápio (src/app/(customer)/menu/)
  → Adiciona itens ao carrinho (src/stores/cartStore.ts)
  → Checkout via Pix ou Stripe (src/components/payment/)
  → Pedido criado (src/services/orderService.ts)
  → Sincronização offline se sem conexão (src/lib/offline/)
```

### 2. Fluxo Admin (Gestão)

```
Admin faz login (src/lib/auth/)
  → Dashboard admin (src/app/admin/dashboard/)
  → Gerencia categorias, produtos, combos, modificadores (src/services/)
  → Acompanha pedidos em tempo real (Supabase Realtime)
  → Atualiza status de pedidos
```

### 3. Fluxo Cozinha/Garçom

```
Cozinha recebe pedido via realtime (src/hooks/useRealtimeOrders.ts)
  → Atualiza status do pedido (pending → preparing → ready)
  → Garçom é notificado (src/stores/tableStore.ts)
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
┌─────────────────┐     ┌─────────────────┐
│   Dexie (IDB)   │────▶│   Zustand       │
│  - menus        │     │  - menuStore    │
│  - orders       │     │  - cartStore    │
│  - tables       │     │  - tableStore   │
└─────────────────┘     └─────────────────┘
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
