# Pedi-AI — Contexto do Projeto

> **Versão:** 1.5.0 | **Atualizado em:** 2026-05-22
> **Idioma:** Todo código, UI e documentação em **português brasileiro (pt-BR)**

---

## O Que É o Pedi-AI

**Pedi-AI** é uma plataforma de **cardápio digital** para restaurantes que opera em três frentes:

| Frente             | Descrição                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| **Cliente**        | Navegação do cardápio, pedidos, pagamentos, acompanhamento em tempo real                            |
| **Admin**          | Gestão de cardápio (categorias, produtos, combos, modificadores), mesas/QR codes, pedidos, usuários |
| **Cozinha/Garçom** | Display de pedidos em tempo real via Socket.io                                                      |

O sistema é **mobile-first**, **offline-first** e **multi-tenant** (um usuário pode gerenciar múltiplos restaurantes).

---

## Tech Stack

| Camada               | Tecnologia                                   |
| -------------------- | -------------------------------------------- |
| **Frontend**         | Next.js 16 + TypeScript + React 19           |
| **Backend**          | NestJS + Fastify + Prisma ORM + PostgreSQL   |
| **Offline**          | Service Worker (Workbox) + IndexedDB (Dexie) |
| **Estado**           | Zustand + React Query                        |
| **Pagamentos**       | Mercado Pago (PIX apenas)                    |
| **Autenticação**     | JWT com bcrypt (PostgresAuthAdapter)         |
| **Testes Unitários** | Vitest (116 test files, 1442 tests)          |
| **Testes E2E**       | Playwright (43 specs)                        |

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
│   ├── external/             # APIs externas (NestJS, Mercado Pago)
│   └── repositories/        # Repository implementations
└── presentation/             # NEXT.JS - UI, API routes, web-only
```

### Regras de Dependência

| Camada              | Pode importar de             |
| ------------------- | ---------------------------- |
| **domain/**         | Ninguém (puro)               |
| **application/**    | domain/ e interfaces         |
| **infrastructure/** | domain/ e libraries externas |
| **presentation/**   | application/ e components    |

### Bounded Contexts

| Context         | Entities                             | Status |
| --------------- | ------------------------------------ | ------ |
| `admin/`        | Restaurante, UsuarioRestaurante      | ✅     |
| `autenticacao/` | Usuario, Sessao                      | ✅     |
| `cardapio/`     | Categoria, Produto, GrupoModificador | ✅     |
| `mesa/`         | Mesa                                 | ✅     |
| `pagamento/`    | Pagamento, Transacao                 | ✅     |
| `pedido/`       | Pedido, ItemPedido                   | ✅     |

---

## Fluxos Principais

### 1. Fluxo Cliente (Pedido)

```
Cliente escaneia QR code
  → Validação de mesa (src/lib/qr.ts com HMAC-SHA256)
  → Navega cardápio (src/app/restaurantes/[restaurantId]/cardapio/)
  → Adiciona itens ao carrinho (src/infrastructure/persistence/cartStore.ts)
  → Checkout via PIX (src/components/payment/)
  → Pedido criado (src/application/pedido/services/CriarPedidoUseCase.ts)
  → Sincronização offline se sem conexão (src/lib/offline/)
```

### 2. Fluxo Admin (Gestão)

```
Admin faz login (src/lib/auth/)
  → Dashboard admin (src/app/admin/dashboard/)
  → Gerencia categorias, produtos, combos, modificadores (src/application/admin/services/)
  → Acompanha pedidos em tempo real (Socket.io)
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

| Rota                                    | Descrição                                |
| --------------------------------------- | ---------------------------------------- |
| `/`                                     | Landing page (marketing)                 |
| `/restaurantes`                         | Lista pública de restaurantes (delivery) |
| `/restaurantes/[restaurantId]/cardapio` | Cardápio digital                         |
| `/menu`                                 | Cardápio digital legado (redireciona)    |
| `/cart`                                 | Carrinho de compras                      |
| `/checkout`                             | Pagamento e finalização                  |
| `/order/[orderId]`                      | Acompanhamento do pedido                 |

### Admin

| Rota                   | Descrição                    |
| ---------------------- | ---------------------------- |
| `/admin/dashboard`     | Painel administrativo        |
| `/admin/orders`        | Gestão de pedidos            |
| `/admin/products`      | CRUD de produtos             |
| `/admin/categories`    | CRUD de categorias           |
| `/admin/tables`        | CRUD de mesas/QR codes       |
| `/admin/users`         | Gestão de usuários           |
| `/admin/combos`        | CRUD de combos               |
| `/admin/modifiers`     | CRUD de modificadores        |
| `/admin/configuracoes` | Configurações do restaurante |

### Cozinha/Garçom

| Rota       | Descrição                |
| ---------- | ------------------------ |
| `/kitchen` | Display de cozinha (KDS) |

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

### PIX (Mercado Pago)

```
1. Cliente seleciona Pix
2. Backend cria PagamentoAggregate
3. PixAdapter gera QR Code
4. Cliente paga no app do banco
5. Webhook recebe confirmação
6. PagamentoConfirmadoEvent publicado
7. Pedido atualizado para confirmed
```

---

## Feature Flags

O projeto possui um sistema de **feature flags** via variáveis de ambiente:

| Flag                                  | Descrição                                           |
| ------------------------------------- | --------------------------------------------------- |
| `NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED` | Modo offline com service worker e cache local       |
| `NEXT_PUBLIC_FEATURE_PIX_ENABLED`     | Pagamento via PIX (Mercado Pago)                    |
| `NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED` | Leitura e geração de QR codes para mesas            |
| `NEXT_PUBLIC_FEATURE_COMBOS_ENABLED`  | Sistema de combos/meal deals                        |
| `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT` | Suporte multi-restaurante (N:N usuário-restaurante) |

---

## Segurança

| Mecanismo                   | Descrição                                       |
| --------------------------- | ----------------------------------------------- |
| **QR Code**                 | Assinatura HMAC-SHA256 para evitar falsificação |
| **Isolamento PostgreSQL**   | Políticas de acesso para isolamento de tenants  |
| **Webhook Idempotência**    | Evita processamento duplicado de webhooks       |
| **Validação de Assinatura** | Webhooks Mercado Pago validados                 |

---

## Database Schema

Schema Prisma em `apps/api/prisma/schema.prisma`:

| Tabela                 | Descrição                                                |
| ---------------------- | -------------------------------------------------------- |
| `restaurants`          | Restaurantes (multi-tenant)                              |
| `user_restaurants`     | Junction table N:N (usuários com múltiplos restaurantes) |
| `tables`               | Mesas com QR Code                                        |
| `categories`           | Categorias do cardápio                                   |
| `products`             | Produtos com modifiers                                   |
| `modifier_groups`      | Grupos de modificadores                                  |
| `modifier_values`      | Valores de modificadores                                 |
| `combos`               | Combos com preço fixo                                    |
| `combo_items`          | Itens dos combos                                         |
| `orders`               | Pedidos                                                  |
| `order_items`          | Itens do pedido                                          |
| `order_status_history` | Histórico de status                                      |
| `users_profiles`       | Perfis de usuário (owner/manager/staff)                  |
| `webhook_events`       | Eventos de webhook (idempotência)                        |
| `combo_products`       | Associação de produtos a combos                          |

---

## Comandos Principais

```bash
# Desenvolvimento
pnpm dev          # Rodar app (Next.js :3000 + API :3001)
pnpm build        # Build de produção
pnpm start        # Start em produção

# Testes
pnpm test         # Testes unitários (Vitest)
pnpm test:watch   # Testes em watch mode
pnpm test:coverage # Com cobertura

# E2E (requer docker-compose up)
pnpm test:e2e           # Rodar E2E
pnpm test:e2e:seed     # Popular dados de teste
pnpm test:e2e:ui        # E2E com UI

# Lint
pnpm lint           # ESLint
```

---

## Ponto de Atenção para Agents

1. **Este NÃO é o Next.js que você conhece** — Next.js 16 tem APIs e convenções diferentes. Leia `node_modules/next/dist/docs/` antes de escrever código.

2. **Arquitetura DDD** — `apps/web` segue arquitetura DDD em camadas. Código legacy em `services/` e `stores/` foi migrado para `application/` e `infrastructure/`.

3. **Código DDD é puro** — `domain/` não pode importar de frameworks ou bibliotecas de infra. É TypeScript puro.

4. **Offline-first (apps/web)** — Toda feature deve funcionar offline. Use Dexie para persistência local e Workbox para background sync.

5. **Multi-tenant** — Restaurants são isolados no PostgreSQL. Queries DEVEM sempre filtrar por `restaurantId`.

6. **Testes** — 1441 testes unitários. Antes de merge, todos os testes DEVEM passar.

7. **Pagamentos** — Apenas PIX via Mercado Pago (sem Stripe).

8. **Autenticação** — JWT com bcrypt via `PostgresAuthAdapter`.

---

## Arquivos de Referência

| Arquivo                       | Descrição                      |
| ----------------------------- | ------------------------------ |
| `AGENTS.md`                   | Regras do projeto e convenções |
| `CLAUDE.md`                   | Orientação para Claude Code    |
| `codemap.md`                  | Visão geral da arquitetura     |
| `README.md`                   | Documentação principal         |
| `docs/guides/ARCHITECTURE.md` | Guia de arquitetura DDD        |
| `docs/guides/OFFLINE.md`      | Guia offline-first             |
| `docs/guides/PAYMENTS.md`     | Guia de pagamentos PIX         |
| `docs/guides/QR_CODE.md`      | Guia de QR code                |
| `docs/guides/ROLES.md`        | Guia de roles e permissões     |
