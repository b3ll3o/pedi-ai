# Pedi-AI — Contexto do Projeto

> **Versão:** 1.2.0 | **Atualizado em:** 2026-05-11
> **Idioma:** Todo código, UI e documentação em **português brasileiro (pt-BR)**

---

## O Que É o Pedi-AI

**Pedi-AI** é uma plataforma de **cardápio digital** para restaurantes que opera em três frentes:

| Frente | Descrição |
|--------|-----------|
| **Cliente** | Navegação do cardápio, pedidos, pagamentos, acompanhamento em tempo real |
| **Admin** | Gestão de cardápio (categorias, produtos, combos, modificadores), mesas/QR codes, pedidos, usuários |
| **Cozinha/Garçom** | Display de pedidos em tempo real via Supabase Realtime |

O sistema é **mobile-first**, **offline-first** e **multi-tenant** (um usuário pode gerenciar múltiplos restaurantes).

---

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| **Framework** | Next.js 16 + TypeScript + React 19 |
| **Backend** | Supabase (Auth, Database, Realtime, Storage) |
| **Offline** | Service Worker (Workbox) + IndexedDB (Dexie) |
| **Estado** | Zustand + React Query |
| **Pagamentos** | Mercado Pago (Pix) + Stripe (Cartão) |
| **Testes Unitários** | Vitest (517 testes, 97%+ cobertura) |
| **Testes E2E** | Playwright (19 specs) |

---

## Arquitetura DDD

O projeto segue **Domain-Driven Design** com bounded contexts organizados em camadas:

### Estrutura de Diretórios

```
src/
├── domain/                    # REGRAS DE NEGÓCIO - puro, testável, sem deps
│   ├── admin/                # Restaurantes, usuários-restaurante
│   ├── autenticacao/         # Usuários, sessões
│   ├── cardapio/             # Categorias, produtos, modificadores
│   ├── mesa/                 # Mesas, QR codes
│   ├── pagamento/            # Pagamentos, transações
│   ├── pedido/               # Pedidos, itens, status FSM
│   └── shared/               # Tipos, exceções, value objects compartilhados
├── application/               # CASOS DE USO - orquestração
│   └── [bounded-context]/services/
├── infrastructure/           # IMPLEMENTAÇÕES - adapters, repos
│   ├── persistence/          # Dexie/IndexedDB implementations
│   ├── external/             # APIs externas (Supabase, Stripe, Mercado Pago)
│   └── repositories/        # Repository implementations
└── presentation/             # NEXT.JS - UI, API routes, web-only (futuro)
```

### Regras de Dependência

| Camada | Pode importar de |
|--------|------------------|
| **domain/** | Ninguém (puro) |
| **application/** | domain/ e interfaces |
| **infrastructure/** | domain/ e libraries externas |
| **presentation/** | application/ e components |

### Bounded Contexts

| Context | Entities | Status |
|---------|----------|--------|
| `admin/` | Restaurante, UsuarioRestaurante | ✅ |
| `autenticacao/` | Usuario, Sessao | ✅ |
| `cardapio/` | Categoria, Produto, GrupoModificador | ✅ |
| `mesa/` | Mesa | ✅ |
| `pagamento/` | Pagamento, Transacao | ✅ |
| `pedido/` | Pedido, ItemPedido | ✅ |

---

## Estrutura Legacy (Coexiste com DDD)

```
src/
├── app/                    # Next.js App Router - páginas e API routes
├── components/             # Componentes React (admin, cart, menu, order, payment, shared, kitchen, restaurant)
├── hooks/                  # Custom React hooks (useAuth, useRealtimeOrders, etc)
├── lib/                    # Utilitários (auth, offline, QR, supabase, feature-flags)
├── services/               # Lógica de negócio legacy (adminOrderService, userService, etc)
└── stores/                 # Zustand stores (cartStore, menuStore, restaurantStore, tableStore)
```

> **Nota:** `services/` e `stores/` são legacy e estão em migração gradual para DDD.

---

## Fluxos Principais

### 1. Fluxo Cliente (Pedido)

```
Cliente escaneia QR code
  → Validação de mesa (src/lib/qr.ts com HMAC-SHA256)
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
  → Atualiza status do pedido (pending → confirmed → preparing → ready → delivered)
  → Garçom é notificado
  → Entrega ao cliente
```

---

## Rotas Principais

### Landing e Cliente

| Rota | Descrição |
|------|-----------|
| `/` | Landing page (marketing) |
| `/restaurantes` | Lista pública de restaurantes (delivery) |
| `/restaurantes/[restaurantId]/cardapio` | Cardápio digital |
| `/menu` | Cardápio digital legado (redireciona para `/restaurantes`) |
| `/cart` | Carrinho de compras |
| `/checkout` | Pagamento e finalização |
| `/order/[orderId]` | Acompanhamento do pedido |

### Admin

| Rota | Descrição |
|------|-----------|
| `/admin/dashboard` | Painel administrativo |
| `/admin/orders` | Gestão de pedidos |
| `/admin/products` | CRUD de produtos |
| `/admin/categories` | CRUD de categorias |
| `/admin/tables` | CRUD de mesas/QR codes |
| `/admin/users` | Gestão de usuários |
| `/admin/combos` | CRUD de combos |
| `/admin/modifiers` | CRUD de modificadores |
| `/admin/analytics` | Dashboard de analytics |
| `/admin/configuracoes` | Configurações do restaurante |

### Cozinha/Garçom

| Rota | Descrição |
|------|-----------|
| `/kitchen` | Display de cozinha (KDS) |
| `/dashboard` | Dashboard garçom em tempo real |

---

## Offline-First

A aplicação **funciona sem internet** através de:

1. **Service Worker (Workbox)**
   - Cache de assets estáticos
   - Cache de respostas de API
   - Background sync para pedidos

2. **IndexedDB (Dexie)**
   - Persistência de cardápio localmente
   - Carrinho persistente
   - Fila de pedidos offline

3. **Sync Automático**
   - Pedidos feitos offline são enfileirados
   - Retry com backoff exponencial ao reconectar
   - Feedback visual de status de conectividade

---

## Pagamentos

### Pix (Mercado Pago)

```
1. Cliente seleciona Pix
2. Backend cria PagamentoAggregate
3. PixAdapter gera QR Code
4. Cliente paga no app do banco
5. Webhook recebe confirmação
6. PagamentoConfirmadoEvent publicado
7. Pedido atualizado para confirmed
```

### Cartão (Stripe)

```
1. Cliente insere dados do cartão
2. Stripe PaymentIntent criado
3. Confirmação do pagamento
4. Webhook Stripe processa
5. Pedido atualizado
```

---

## Feature Flags

O projeto possui um sistema de **feature flags** via variáveis de ambiente:

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
| `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT` | Suporte multi-restaurante (N:N usuário-restaurante) |

**Uso no código:**

```typescript
import { isPixEnabled, isOfflineEnabled } from '@/lib/feature-flags';

if (isPixEnabled()) {
  // Mostrar opção de pagamento Pix
}
```

---

## Segurança

| Mecanismo | Descrição |
|-----------|-----------|
| **QR Code** | Assinatura HMAC-SHA256 para evitar falsificação |
| **RLS** | Row Level Security no Supabase para isolamento de tenants |
| **Webhook Idempotência** | Evita processamento duplicado de webhooks |
| **Validação de Assinatura** | Webhooks Mercado Pago/Stripe validados |

### Validação de Mesa (QR Code)

O QR code codifica:
```
https://pedi.ai/menu?r={restauranteId}&m={mesaId}
```

Formato do payload:
```typescript
{
  restauranteId: string;
  mesaId: string;
  timestamp: number;
}
```

Assinatura: HMAC-SHA256 com `QR_SECRET_KEY`

---

## Database Schema

Principais tabelas no Supabase:

| Tabela | Descrição |
|--------|-----------|
| `restaurants` | Restaurantes (multi-tenant) |
| `user_restaurants` | Junction table N:N (usuários com múltiplos restaurantes) |
| `tables` | Mesas com QR Code |
| `categories` | Categorias do cardápio |
| `products` | Produtos com modifiers |
| `modifier_groups` | Grupos de modificadores |
| `modifier_values` | Valores de modificadores |
| `combos` | Combos com preço fixo |
| `combo_items` | Itens dos combos |
| `orders` | Pedidos |
| `order_items` | Itens do pedido |
| `order_status_history` | Histórico de status |
| `users_profiles` | Perfis de usuário (owner/manager/staff) |
| `webhook_events` | Eventos de webhook (idempotência) |
| `combo_products` | Associação de produtos a combos |

---

## Regras do Projeto

### Idioma
- Todo código, UI, mensagens e documentação em **português brasileiro (pt-BR)**
- Nomes de variáveis, funções e componentes em inglês (convenção técnica)
- Mensagens de erro sempre em português

### Design Responsivo
- Mobile-first: desenvolver para mobile primeiro, escalar para desktop
- Breakpoints: Mobile (< 640px), Tablet (640-1024px), Desktop (> 1024px)
- Touch-friendly: botões mínimo 44x44px

### CSS
- Usar `rem` para tamanhos de fonte e espaçamento
- Usar `em` para valores relativos ao elemento pai
- Evitar `px` para tamanhos de fonte (exceto valores < 4px)
- Usar CSS Custom Properties (variáveis)
- Usar `clamp()` para valores fluidos

### HTML Semântico
- Heading hierarchy: apenas UM `h1` por página
- Landmarks: `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`, `<aside>`
- Listas: `<ul>` e `<li>` para listas de itens
- Botões vs Links: `<button>` para ações, `<a>` para navegação

### SEO
- Metadata completa em todas as páginas: `title`, `description`, `og:*`, `twitter:*`, `robots`, `canonical`
- Usar `next/image` com `alt` descritivo
- URLs semânticas em minúsculas com hífens
- Structured Data JSON-LD para Organization, WebSite, FAQPage, Restaurant

### Testes
- Cobertura mínima: **80%** para unit tests
- Testes E2E devem ser atualizados IMEDIATAMENTE ao modificar qualquer funcionalidade
- Todos os fluxos principais DEVEM ter teste E2E

---

## Comandos Principais

```bash
# Desenvolvimento
pnpm dev          # Rodar app
pnpm build        # Build de produção
pnpm start        # Start em produção

# Testes
pnpm test         # Testes unitários (Vitest)
pnpm test:watch   # Testes em watch mode
pnpm test:coverage # Com cobertura

# E2E (requer .env.e2e com Supabase Cloud)
pnpm test:e2e           # Rodar E2E (Chromium headless)
pnpm test:e2e:seed     # Popular dados de teste
pnpm test:e2e:cleanup   # Limpar dados de teste
pnpm test:e2e:ui        # E2E com UI
pnpm test:e2e:all       # E2E em todos os browsers

# Lint
pnpm lint           # ESLint
pnpm format         # Prettier
```

---

## Variáveis de Ambiente

```env
# Supabase
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

# Feature Flags (valores padrão: false)
NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED=true
NEXT_PUBLIC_FEATURE_PIX_ENABLED=true
NEXT_PUBLIC_FEATURE_STRIPE_ENABLED=true
NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED=true
```

---

## Ponto de Atenção para Agents

1. **Este NÃO é o Next.js que você conhece** — Next.js 16 tem APIs e convenções diferentes. Leia `node_modules/next/dist/docs/` antes de escrever código.

2. **Arquitetura híbrida** — O projeto está em transição de código legacy (`services/`, `stores/`) para DDD (`domain/`, `application/`, `infrastructure/`). Novo código deve seguir DDD.

3. **Código DDD é puro** — `domain/` não pode importar de Next.js, React, ou bibliotecas de infra. É TypeScript puro.

4. **Offline-first** — Toda feature deve funcionar offline. Use Dexie para persistência local e Workbox para background sync.

5. **Multi-tenant** — Restaurants são isolados por RLS no Supabase. Stores e queries devem sempre filtrar por `restaurantId`.

6. **Testes** — 517 testes unitários com 97%+ cobertura. Antes de merge, todos os testes DEVEM passar.

7. **Acessibilidade** — Seguir regras de HTML semântico, ARIA labels, e hierarquia de headings.

---

## Arquivos de Referência

| Arquivo | Descrição |
|---------|-----------|
| `AGENTS.md` | Regras do projeto e convenções |
| `codemap.md` | Visão geral da arquitetura |
| `src/app/codemap.md` | Estrutura de rotas |
| `src/domain/*/codemap.md` | Bounded contexts DDD |
| `README.md` | Documentação principal |
| `docs/guides/ARCHITECTURE.md` | Guia de arquitetura DDD |
| `docs/guides/OFFLINE.md` | Guia offline-first |
| `docs/guides/PAYMENTS.md` | Guia de pagamentos |
| `docs/guides/QR_CODE.md` | Guia de QR code |
