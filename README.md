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
- **Testes Unitários**: Vitest (517 testes, 97%+ cobertura)
- **Testes E2E**: Playwright (19 specs)
- **Pagamentos**: Mercado Pago (Pix) + Stripe (Cartão)

## Documentação

| Guia | Descrição |
|------|-----------|
| [docs/README.md](docs/README.md) | Hub de documentação |
| [docs/INDICE.md](docs/INDICE.md) | Índice completo |
| [docs/guides/ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) | Arquitetura DDD |
| [docs/guides/OFFLINE.md](docs/guides/OFFLINE.md) | Offline-first |
| [docs/guides/REALTIME.md](docs/guides/REALTIME.md) | Realtime subscriptions |
| [docs/guides/PAYMENTS.md](docs/guides/PAYMENTS.md) | Pagamentos |
| [docs/guides/QR_CODE.md](docs/guides/QR_CODE.md) | QR Code e segurança |
| [docs/guides/ROLES.md](docs/guides/ROLES.md) | Roles e permissões |
| [docs/guides/MOBILE_PWA.md](docs/guides/MOBILE_PWA.md) | Mobile-first PWA |

## Feature Flags

O projeto possui um sistema de **feature flags** que permite ativar/desativar funcionalidades de forma granular via variáveis de ambiente. Isso é útil para:

- **Desenvolvimento**: Ativar apenas funcionalidades em desenvolvimento sem afetar outras áreas
- **Testes**: Testar funcionalidades específicas isoladamente
- **Rollout gradual**: Liberar funcionalidades para um subconjunto de usuários ou ambientes
- **Produção**: Desabilitar funcionalidades problemáticas sem fazer deploy

### Flags Disponíveis

| Flag | Descrição |
|------|-----------|
| `NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED` | Modo offline com service worker e cache local |
| `NEXT_PUBLIC_FEATURE_PIX_ENABLED` | Pagamento via Pix (Mercado Pago) |
| `NEXT_PUBLIC_FEATURE_STRIPE_ENABLED` | Pagamento via Cartão (Stripe) |
| `NEXT_PUBLIC_FEATURE_WAITER_MODE` | Modo garçom/chamada de atendimento |
| `NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED` | Leitura e geração de QR codes para mesas |
| `NEXT_PUBLIC_FEATURE_COMBOS_ENABLED` | Sistema de combos/meal deals |
| `NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED` | Dashboard de analytics e rastreamento de eventos |
| `NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED` | Sistema de cashback/recompensas |
| `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT` | Suporte multi-restaurante (relação N:N usuário-restaurante) |

### Configuração

Adicione ao seu `.env.local`:

```env
# Feature Flags (valores padrão: false)
NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED=true
NEXT_PUBLIC_FEATURE_PIX_ENABLED=true
NEXT_PUBLIC_FEATURE_STRIPE_ENABLED=true
NEXT_PUBLIC_FEATURE_WAITER_MODE=false
NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED=true
NEXT_PUBLIC_FEATURE_COMBOS_ENABLED=false
NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED=false
NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED=false
NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT=false
```

### Uso no Código

```typescript
import { isPixEnabled, isOfflineEnabled } from '@/lib/feature-flags';

// Verificar se uma flag está ativa
if (isPixEnabled()) {
  // Mostrar opção de pagamento Pix
}
```

Todas as flags são **client-side** (prefixadas com `NEXT_PUBLIC_`) e podem ser verificadas em qualquer componente ou hook React.

## Getting Started

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar ambiente

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.local.example .env.local
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

Siga as instruções em [docs/setup/SUPABASE_SETUP.md](docs/setup/SUPABASE_SETUP.md) para:

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

# E2E (Playwright) — requer .env.e2e com Supabase Cloud
pnpm test:e2e           # Rodar E2E (Chromium headless)
pnpm test:e2e:seed     # Popular dados de teste no Supabase Cloud
pnpm test:e2e:cleanup   # Limpar dados de teste
pnpm test:e2e:ui        # E2E com UI
pnpm test:e2e:all       # E2E em todos os browsers

# Lint
pnpm lint           # ESLint
pnpm format         # Prettier
```

## Regras do Projeto

O projeto segue regras definidas em [AGENTS.md](./AGENTS.md):

- **Idioma**: Todo código, UI e documentação em **português brasileiro (pt-BR)**
- **Mobile-first**: Desenvolver para mobile primeiro, escalar para desktop
- **Offline-first**: Funciona sem internet, sync automático ao reconectar
- **Cobertura mínima**: 80% para unit tests
- **Testes E2E**: Atualizados imediatamente ao modificar qualquer funcionalidade

## Estrutura do Projeto

```
src/
├── app/                    # Next.js App Router
│   ├── (customer)/        # Rotas do cliente (cardápio, checkout, pedido)
│   │   ├── cart/         # Carrinho
│   │   ├── checkout/     # Finalização
│   │   ├── menu/        # Cardápio (lista categorias)
│   │   ├── order/       # Acompanhamento pedido
│   │   └── product/     # Detalhe do produto
│   ├── (waiter)/         # Rotas garçom (display cozinha)
│   │   └── dashboard/   # Dashboard cozinha
│   ├── admin/            # Painel administrativo
│   │   ├── analytics/   # Analytics
│   │   ├── categories/  # CRUD categorias
│   │   ├── combos/      # CRUD combos
│   │   ├── configuracoes/ # Configurações
│   │   ├── dashboard/   # Dashboard principal
│   │   ├── login/       # Login admin
│   │   ├── modifiers/   # CRUD modificadores
│   │   ├── orders/      # Gestão pedidos
│   │   ├── products/    # CRUD produtos
│   │   ├── restaurants/  # CRUD restaurantes (multi-tenant)
│   │   ├── tables/      # CRUD mesas/QR
│   │   └── users/       # Gestão usuários
│   ├── api/              # API routes
│   ├── kitchen/          # Display cozinha
│   ├── login/            # Login cliente
│   ├── register/         # Registro cliente
│   └── table/            # QR code scan
├── components/            # Componentes React (admin, cart, menu, order, payment, shared)
├── hooks/               # React Hooks
├── lib/
│   ├── auth/            # Auth
│   ├── offline/         # IndexedDB, sync
│   ├── qr/              # QR code
│   └── supabase/        # Cliente Supabase
├── services/             # Lógica de negócio
└── stores/              # Zustand stores
```

## Database Schema

O banco de dados possui as seguintes tabelas:

- `restaurants` — Restaurantes (multi-tenant)
- `user_restaurants` — Junction table N:N (usuários com múltiplos restaurantes)
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
- `webhook_events` — Eventos de webhook (idempotência)
- `combo_products` — Associação de produtos a combos

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
# Unit tests (517 testes)
pnpm test

# E2E tests (19 specs) — requer Supabase Cloud configurado em .env.e2e
pnpm test:e2e:seed    # Popula dados de teste
pnpm test:e2e         # Executa testes E2E
```

## License

MIT
