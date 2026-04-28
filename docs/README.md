# Documentação do Pedi-AI

> Sistema de cardápio digital para restaurantes com suporte offline e tempo real.

---

## 📍 Navegação Rápida

### Primeros Passos
| Documento | Descrição |
|-----------|-----------|
| [README do Projeto](../README.md) | Visão geral, stack e Quick Start |
| [AGENTS.md](../AGENTS.md) | Regras de desenvolvimento (pt-BR, mobile-first, DDD) |
| [codemap.md](../codemap.md) | Mapa completo do repositório |

### Guias de Configuração
| Documento | Descrição | Quando Consultar |
|-----------|-----------|-----------------|
| [SUPABASE_SETUP.md](setup/SUPABASE_SETUP.md) | Configurar projeto Supabase, migrations, seed E2E | Setup inicial de desenvolvimento |
| [STRIPE_CLI_SETUP.md](setup/STRIPE_CLI_SETUP.md) | Configurar Stripe CLI para webhooks locais | Testar pagamentos com cartão |
| [MAILPIT_SETUP.md](setup/MAILPIT_SETUP.md) | Servidor SMTP mock para testes de email | Testar emails em desenvolvimento |

### Guias Técnicos
| Documento | Descrição | Quando Consultar |
|-----------|-----------|-----------------|
| [ARCHITECTURE.md](guides/ARCHITECTURE.md) | Arquitetura DDD em 4 camadas | Entender estrutura domain/application/infrastructure |
| [OFFLINE.md](guides/OFFLINE.md) | Service Worker, Dexie, BackgroundSync, BroadcastChannel | Implementar/modificar funcionalidade offline |
| [REALTIME.md](guides/REALTIME.md) | Supabase Realtime, polling fallback, subscriptions | Implementar atualizações em tempo real |
| [PAYMENTS.md](guides/PAYMENTS.md) | PIX (Mercado Pago), Stripe, webhooks, idempotência | Implementar/modificar pagamentos |
| [QR_CODE.md](guides/QR_CODE.md) | Segurança HMAC-SHA256, validação de QR codes | Implementar/modificar sistema de mesas |
| [ROLES.md](guides/ROLES.md) | RBAC, multi-tenant, RLS, autenticação | Implementar/modificar controle de acesso |
| [MOBILE_PWA.md](guides/MOBILE_PWA.md) | Mobile-first, PWA, safe areas iOS, CSS | Desenvolver UI responsiva |
| [LIGHTHOUSE.md](guides/LIGHTHOUSE.md) | Auditoria de performance manual | Verificar performance e PWA |

### Specs (OpenSpec)
| Domínio | Localização | Descrição |
|---------|-------------|-----------|
| Menu | `../openspec/specs/menu/spec.md` | Cardápio digital, categorias, produtos |
| Carrinho | `../openspec/specs/cart/spec.md` | Carrinho, persistência offline |
| Pedidos | `../openspec/specs/order/spec.md` | Criação, status, FSM |
| Pagamentos | `../openspec/specs/payment/spec.md` | PIX, Stripe, webhooks |
| Autenticação | `../openspec/specs/auth/spec.md` | Auth, roles |
| Admin | `../openspec/specs/admin/spec.md` | Painel administrativo |
| Mesa/QR | `../openspec/specs/table/spec.md` | Mesas, QR codes HMAC |
| Offline | `../openspec/specs/offline/spec.md` | Service Worker, IndexedDB |

### Testes
| Documento | Localização | Descrição |
|-----------|-------------|-----------|
| E2E README | `../tests/e2e/README.md` | Visão geral dos testes E2E |
| FLUXOS | `../tests/e2e/FLUXOS.md` | Detalhamento dos 19 fluxos E2E |

---

## 📁 Estrutura de Diretórios

```
docs/
├── README.md                    # Este arquivo - hub de navegação
├── INDICE.md                    # Índice completo com todas as referências
├── setup/                       # Guias de configuração
│   ├── SUPABASE_SETUP.md        # Configuração do Supabase
│   ├── STRIPE_CLI_SETUP.md      # Configuração do Stripe CLI
│   └── MAILPIT_SETUP.md         # Configuração do Mailpit
├── guides/                      # Guias técnicos
│   ├── ARCHITECTURE.md          # Arquitetura DDD
│   ├── OFFLINE.md               # Offline-first
│   ├── REALTIME.md              # Realtime subscriptions
│   ├── PAYMENTS.md              # Pagamentos
│   ├── QR_CODE.md               # Segurança de QR Code
│   ├── ROLES.md                 # Sistema de funções
│   ├── MOBILE_PWA.md            # Mobile-first e PWA
│   └── LIGHTHOUSE.md            # Auditoria de performance
└── archive/                     # Documentação arquivada
    └── UNDOCUMENTED.md          # Features não documentadas
```

---

## 🔍 Quando Consultar Cada Guia

### Setup Inicial
```
1. Clone o repositório
2. Execute `pnpm install`
3. Copie `.env.local.example` → `.env.local`
4. Configure Supabase: SUPABASE_SETUP.md
5. (Opcional) Configure Stripe: STRIPE_CLI_SETUP.md
6. (Opcional) Configure Mailpit: MAILPIT_SETUP.md
7. Execute `pnpm dev`
```

### Desenvolvendo Nova Funcionalidade
```
1. Leia AGENTS.md para entender as regras do projeto
2. Consulte o spec do domínio em openspec/specs/[dominio]/spec.md
3. Use ARCHITECTURE.md para entender a estrutura DDD
4. Implemente seguindo as regras de dependência
```

### Trabalhando com Offline/PWA
```
1. Comece com OFFLINE.md para entender a arquitetura
2. Consulte MOBILE_PWA.md para CSS e safe areas
3. Use LIGHTHOUSE.md para verificar performance
```

### Implementando Pagamentos
```
1. Leia PAYMENTS.md para entender os fluxos
2. Configure Stripe CLI (STRIPE_CLI_SETUP.md) para testes
3. Consulte QR_CODE.md se trabalhar com mesas
```

### Entendendo Autenticação e Permissões
```
1. Consulte ROLES.md para RBAC e multi-tenant
2. Veja REALTIME.md para como roles afetam subscriptions
```

---

## ⚡ Quick Reference

### Comandos Principais
```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Tests
pnpm test              # Unit tests
pnpm test:e2e          # E2E tests
pnpm test:coverage     # Coverage report

# Offline/Pagamentos
pnpm stripe:listen     # Stripe webhook listener
pnpm mailpit          # Start Mailpit SMTP server
```

### Variáveis de Ambiente Principais
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Pagamentos
NEXT_PUBLIC_DEMO_PAYMENT_MODE=true
STRIPE_WEBHOOK_SECRET=

# QR Code
QR_SECRET_KEY=
```

---

## 📝 Notas

- Toda documentação está em **português brasileiro (pt-BR)** conforme `AGENTS.md`
- Docs em `archive/` são **read-only** — não editar
- `UNDOCUMENTED.md` é **auto-gerado** — não editar manualmente
- Para contribuir com nova documentação, edite o arquivo relevante
