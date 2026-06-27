# Pedi-AI — Cardápio Digital

Aplicação de **Cardápio Digital** para restaurantes com foco em **mobile-first** e **offline-first**.

## Funcionalidades

- 📱 **Cardápio Digital** — Navegação por categorias, produtos, filtros dietéticos, busca
- 🛒 **Carrinho** — Gestão de itens com modificadores, combos e persistência offline
- 💳 **Pagamentos** — PIX (Mercado Pago)
- 📊 **Pedidos** — Criação, acompanhamento em tempo real, histórico
- 🍽️ **QR Code** — Identificação de mesas com assinatura HMAC-SHA256
- 👨‍💼 **Painel Admin** — CRUD completo de categorias, produtos, modifiers, combos, mesas
- 👨‍🍳 **Modo Cozinha** — Display de pedidos pendentes em tempo real
- 📶 **Offline-First** — Funciona sem internet, sync automático ao reconectar

## Stack

- **Frontend**: Next.js 16 + TypeScript + React 19
- **Backend**: NestJS + Fastify + Prisma ORM + PostgreSQL
- **Offline**: Service Worker (Workbox) + IndexedDB (Dexie)
- **Estado**: Zustand + React Query
- **Testes Unitários**: Vitest (205 test files, 2388 testes)
- **Testes E2E**: Playwright (43 specs)
- **Pagamentos**: Mercado Pago (PIX)
- **Autenticação**: JWT com bcrypt

## Documentação

| Guia                                                       | Descrição              |
| ---------------------------------------------------------- | ---------------------- |
| [docs/README.md](docs/README.md)                           | Hub de documentação    |
| [docs/INDICE.md](docs/INDICE.md)                           | Índice completo        |
| [docs/guides/ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) | Arquitetura DDD        |
| [docs/guides/OFFLINE.md](docs/guides/OFFLINE.md)           | Offline-first          |
| [docs/guides/REALTIME.md](docs/guides/REALTIME.md)         | Realtime subscriptions |
| [docs/guides/PAYMENTS.md](docs/guides/PAYMENTS.md)         | Pagamentos PIX         |
| [docs/guides/QR_CODE.md](docs/guides/QR_CODE.md)           | QR Code e segurança    |
| [docs/guides/ROLES.md](docs/guides/ROLES.md)               | Roles e permissões     |
| [docs/guides/MOBILE_PWA.md](docs/guides/MOBILE_PWA.md)     | Mobile-first PWA       |

## Feature Flags

O projeto possui um sistema de **feature flags** que permite ativar/desativar funcionalidades de forma granular via variáveis de ambiente.

### Flags Disponíveis

| Flag                                    | Descrição                                                   |
| --------------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED`   | Modo offline com service worker e cache local               |
| `NEXT_PUBLIC_FEATURE_PIX_ENABLED`       | Pagamento via PIX (Mercado Pago)                            |
| `NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED`   | Leitura e geração de QR codes para mesas                    |
| `NEXT_PUBLIC_FEATURE_COMBOS_ENABLED`    | Sistema de combos/meal deals                                |
| `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT`   | Suporte multi-restaurante (relação N:N usuário-restaurante) |
| `NEXT_PUBLIC_FEATURE_WAITER_MODE`       | Sistema de chamada de garçom                                |
| `NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED` | Dashboard de analytics                                      |
| `NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED`  | Sistema de cashback/recompensa                              |

## Getting Started

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` com suas credenciais.

### 3. Subir infraestrutura com Docker

```bash
docker-compose -f docker-compose.dev.yml up -d
```

Isso sobe PostgreSQL + Mailpit + API + Web + Nginx (com hot reload).

### 4. Aplicar schema e seed

```bash
pnpm prisma db push
pnpm db:seed
```

### 5. Rodar em desenvolvimento

```bash
pnpm dev              # Next.js em :3000 + API em :3001
```

Abrir [http://localhost:3000](http://localhost:3000)

## Scripts

```bash
# Desenvolvimento
pnpm dev          # Rodar app (Next.js :3000 + API :3001)
pnpm build        # Build de produção

# Testes unitários (Vitest)
pnpm test         # Todos os testes
pnpm test:watch   # Watch mode
pnpm test:coverage # Com cobertura
pnpm test:unit    # Apenas unitários
pnpm test:integration # Apenas integração
pnpm test:ui      # Vitest UI

# E2E (Playwright) — requer docker-compose.dev.yml up
pnpm test:e2e           # Rodar E2E
pnpm test:e2e:seed     # Popular dados de teste
pnpm test:e2e:ui        # E2E com UI
pnpm test:e2e:smoke    # Smoke tests
pnpm test:e2e:critical # Critical path
pnpm test:e2e:fast     # Fast tests
pnpm test:e2e:cleanup  # Cleanup dados

# Lint
pnpm lint           # ESLint
```

## Estrutura do Projeto

```
pedi-ai/
├── apps/
│   ├── api/              # NestJS + Prisma + PostgreSQL
│   │   └── src/
│   │       ├── domain/       # DDD: entidades, value objects
│   │       ├── application/   # DDD: use cases
│   │       ├── infrastructure/ # DDD: repositories
│   │       └── presentation/  # NestJS: controllers, gateways
│   └── web/              # Next.js 16 + TypeScript
│       └── src/
│           ├── domain/        # DDD: entidades, value objects
│           ├── application/   # DDD: use cases
│           ├── infrastructure/ # DDD: repositories
│           └── presentation/   # Next.js: app, components, hooks
├── packages/
│   └── shared/           # Código compartilhado
└── docs/                  # Documentação
```

## Arquitetura DDD

O projeto segue **Domain-Driven Design** com bounded contexts:

| Context         | Descrição                           |
| --------------- | ----------------------------------- |
| `admin/`        | Restaurantes, usuários-restaurante  |
| `autenticacao/` | Usuários, sessões                   |
| `cardapio/`     | Categorias, produtos, modificadores |
| `mesa/`         | Mesas, QR codes                     |
| `pagamento/`    | Pagamentos PIX                      |
| `pedido/`       | Pedidos, itens                      |

## Segurança

- **QR Code**: Assinatura HMAC-SHA256 para evitar falsificação
- **Webhook Idempotência**: Evita processamento duplicado
- **Validação de Assinatura**: Webhooks Mercado Pago validados

## License

MIT
