# Pedi-AI — Cardápio Digital

Aplicação de **Cardápio Digital** para restaurantes com foco em **mobile-first** e **offline-first**.

## Funcionalidades

- 📱 **Cardápio Digital** — Navegação por categorias, produtos, filtros dietéticos, busca
- 🛒 **Carrinho** — Gestão de itens com modificadores, combos e persistência offline
- 💳 **Pagamentos** — Pix (Mercado Pago) e Cartão (Stripe)
- 📊 **Pedidos** — Criação, acompanhamento em tempo real, histórico
- 🍽️ **QR Code** — Identificação de mesas com assinatura HMAC-SHA256
- 👨‍💼 **Painel Admin** — CRUD completo de categorias, produtos, modifiers, combos, mesas
- 👨‍🍳 **Modo Cozinha** — Display de pedidos pendentes em tempo real
- 📶 **Offline-First** — Funciona sem internet, sync automático ao reconectar

## Stack

- **Frontend**: Next.js 16 + TypeScript + React 19
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **Offline**: Service Worker (Workbox) + IndexedDB (Dexie)
- **Estado**: Zustand + React Query
- **Testes Unitários**: Vitest (338 testes, 80%+ cobertura)
- **Testes E2E**: Playwright (12 specs)
- **Pagamentos**: Mercado Pago (Pix) + Stripe (Cartão)

## Getting Started

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp apps/web/.env.local.example .env.local
```

Edite `.env.local` com:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
NEXT_PUBLIC_SUPABASE_SITE_URL=http://localhost:3000

# Mercado Pago (Pix)
MERCADO_PAGO_ACCESS_TOKEN=seu_token
MP_WEBHOOK_SECRET=seu_webhook_secret

# Stripe (Cartão)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# QR Code
QR_SECRET_KEY=sua_chave_secreta_para_hmac
```

### 3. Configurar Supabase

Siga as instruções em [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) para:

- Criar um projeto no Supabase
- Rodar as migrations
- Configurar autenticação
- Configurar Realtime

### 4. Rodar em desenvolvimento

```bash
pnpm dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Scripts

```bash
# Desenvolvimento
pnpm dev          # Rodar app
pnpm build        # Build de produção
pnpm start        # Start em produção

# Testes
pnpm test         # Testes unitários (Vitest)
pnpm test:watch   # Testes em watch mode
pnpm test:coverage # Com cobertura

# E2E (Playwright)
pnpm test:e2e           # Rodar E2E
pnpm test:e2e:ui        # E2E com UI
pnpm test:e2e:debug     # E2E em modo debug

# Lint
pnpm lint           # ESLint
pnpm format         # Prettier
```

## Estrutura do Projeto

```
pedi-ai/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (customer)/     # Rotas do cliente (cardápio, checkout)
│   │   ├── (admin)/        # Rotas admin (gestão)
│   │   ├── (waiter)/       # Rotas garçom
│   │   └── api/            # API routes
│   ├── components/          # Componentes React
│   │   ├── admin/          # Admin (CategoryForm, ProductForm...)
│   │   ├── cart/            # Carrinho (CartDrawer, CartItem...)
│   │   ├── menu/            # Cardápio (CategoryList, ProductCard...)
│   │   ├── order/           # Pedidos (OrderStatus, OrderHistory...)
│   │   ├── payment/         # Pagamentos (PixQRCode, StripeCardForm...)
│   │   └── shared/          # Compartilhados
│   ├── hooks/               # React Hooks customizados
│   ├── lib/
│   │   ├── auth/           # Auth (guest session)
│   │   ├── offline/        # IndexedDB, sync, cache
│   │   ├── qr/             # QR code (generator, validator)
│   │   └── supabase/       # Cliente Supabase
│   ├── services/            # Lógica de negócio
│   └── stores/              # Zustand stores
├── public/
│   ├── icons/              # Ícones PWA
│   ├── sw.js               # Service Worker
│   ├── manifest.json       # PWA manifest
│   └── offline.html        # Página offline
├── supabase/
│   ├── migrations/         # Migrations SQL
│   └── functions/          # Edge Functions (pix-webhook)
├── tests/
│   ├── e2e/               # Playwright E2E
│   └── unit/               # Vitest unit tests
└── openspec/               # SDD artifacts
```

## Database Schema

O banco de dados possui as seguintes tabelas:

- `restaurants` — Restaurantes (multi-tenant)
- `tables` — Mesas com QR Code
- `categories` — Categorias do cardápio
- `products` — Produtos com modifiers
- `modifier_groups` — Grupos de modificadores
- `modifier_values` — Valores de modificadores
- `combos` — Combos com preço fixo
- `combo_items` — Itens dos combos
- `orders` — Pedidos
- `order_items` — Itens do pedido
- `order_status_history` — Histórico de status
- `users_profiles` — Perfis de usuário (owner/manager/staff)
- `payment_intents` — Intentos de pagamento
- `webhook_events` — Eventos de webhook (idempotência)

## PWA

A aplicação é um **Progressive Web App** com:

- Instalável em dispositivos móveis
- Funciona offline (menu em cache, pedidos em fila)
- Sync automático ao reconectar
- Notificações de status de pedido

## Segurança

- **QR Code**: Assinatura HMAC-SHA256 para evitar falsificação
- **RLS**: Row Level Security no Supabase para isolamento de tenants
- **Webhook Idempotência**: Evita processamento duplicado
- **Validação de Assinatura**: Webhooks Mercado Pago/Stripe validados

## Testes

```bash
# Unit tests (338 testes)
pnpm test

# E2E tests (12 specs)
cd tests/e2e && pnpm install && pnpm test
```

## License

MIT
