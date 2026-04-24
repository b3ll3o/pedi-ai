# src/app/

## Responsibility

Roteamento e páginas da aplicação Pedi-AI — cardápio digital offline-first para restaurantes. Gerencia todas as rotas da aplicação usando Next.js 16 App Router, organizando fluxos distintos (cliente, garçom, admin, cozinha) sob route groups.

## Design

### Route Groups

| Route Group | Path | Purpose |
|-------------|------|---------|
| Root | `/` | Landing page (marketing com pricing, features, testimonials, FAQ) |
| `(customer)` | `(customer)/*` | Rotas de pedido para clientes (cardápio, carrinho, checkout, rastreamento) |
| `(waiter)` | `(waiter)/*` | Dashboard do garçom para gerenciamento de pedidos em tempo real |
| `admin/*` | `admin/*` | Painel admin do restaurante (CRUD produtos, pedidos, categorias, mesas, usuários) |
| `kitchen` | `kitchen` | Kitchen Display System (KDS) para pedidos em tempo real |
| `table/*` | `table/*` | Validação de QR code de mesa |
| `login` | `login` | Autenticação do cliente |
| `register` | `register` | Cadastro de novo usuário |

### Key Pages

#### Customer Route Group `(customer)/`

| Page | Path | Function |
|------|------|----------|
| Menu | `/menu` | Navegar categorias/produtos, adicionar ao carrinho |
| Cart | `/cart` | Revisar/modificar itens do carrinho |
| Checkout | `/checkout` | Pagamento (PIX/Cartão) e envio do pedido |
| Order Status | `/order/[orderId]` | Acompanhar status do pedido |

#### Waiter Route Group `(waiter)/`

| Page | Path | Function |
|------|------|----------|
| Dashboard | `/dashboard` | Dashboard em tempo real com status de conexão |

#### Admin Routes `admin/`

| Page | Path | Function |
|------|------|----------|
| Dashboard | `/admin/dashboard` | Home admin com links de navegação |
| Orders | `/admin/orders` | Listar/filtrar pedidos, gestão de status |
| Products | `/admin/products` | CRUD produtos com filtro por categoria |
| Categories | `/admin/categories` | Gerenciar categorias do cardápio |
| Tables | `/admin/tables` | Gerenciar mesas do restaurante |
| Users | `/admin/users` | Gerenciar staff/usuários |
| Combos | `/admin/combos` | Gerenciar combos |
| Modifiers | `/admin/modifiers` | Gerenciar modificadores de produto |
| Configurações | `/admin/configuracoes` | Configurações do restaurante |
| Login | `/admin/login` | Autenticação admin |
| Analytics | `/admin/analytics` | Relatórios/estatísticas |

### Layout Files

- **Root `layout.tsx`**: ReactQueryProvider, StoreProvider, AppInitializer, ServiceWorkerRegistration, OfflineIndicator, CartBadge, CartDrawer, JSON-LD structured data, full SEO metadata

## Flow

### Fluxo de Dados Principal

```
Cliente → /menu → Adiciona item → /cart → /checkout → Pagamento → /order/[orderId]
                                                              ↓
                                                       Supabase Realtime
                                                              ↓
                                                    Kitchen (KDS) ←→ Waiter Dashboard
```

### API Routes

```
/api/menu/              - GET cardápio completo
/api/orders/            - GET/POST pedidos
/api/cart/              - Validação do carrinho
/api/payments/pix/create/       - Criação PIX
/api/payments/pix/status/       - Status PIX
/api/payments/stripe/create-intent/ - Stripe payment
/api/payments/stripe/webhook/    - Stripe webhook
/api/tables/validate/   - Validação QR mesa
/api/admin/orders/      - Gestão admin de pedidos
/api/admin/products/    - CRUD produtos
/api/admin/categories/  - CRUD categorias
/api/admin/tables/      - CRUD mesas
/api/admin/users/       - Gestão usuários
/api/admin/analytics/   - Analytics admin
```

## Integration

### Dependencies Externas

| Service | Usage |
|---------|-------|
| **Supabase** | Auth, Realtime, Database (PG) |
| **Stripe** | Pagamentos via webhook (cartão) |
| **PIX API** | Pagamentos instantâneos |
| **Dexie (IndexedDB)** | Persistência offline |
| **Workbox** | Service Worker para cache offline |

### Provider Stack (root layout)

1. `ReactQueryProvider` — cache/estado de servidor
2. `StoreProvider` — estado global (carrinho, UI)
3. `AppInitializer` — inicialização offline/sincronização
4. `ServiceWorkerRegistration` — registro SW
5. `OfflineIndicator` — indicador visual de conectividade
6. `CartBadge` / `CartDrawer` — componentes do carrinho

### Arquitetura Offline-First

- Service Worker cacheia assets e respostas de API
- IndexedDB (Dexie) armazena cardápio e pedidos localmente
- Pedidos offline são enfileirados e syncados ao reconectar
- Supabase Realtime mantém cozinha/garçom atualizados

### Tech Stack

- **Next.js 16 App Router** — Server Components + Client Components
- **React 19** — concurrent features
- **TypeScript** — tipagem completa
- **pt-BR** — toda UI em português brasileiro
