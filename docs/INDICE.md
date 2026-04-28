# Índice de Documentação — Pedi-AI

> Este arquivo serve como índice centralizado para toda a documentação do projeto.
> Utilize Ctrl+F ou navegação por seções para encontrar o que precisa.

---

## 📋 Visão Geral

| Documento | Localização | Descrição | Quando Consultar |
|-----------|-------------|-----------|------------------|
| **README.md** | `./README.md` | Hub de documentação, navegação rápida | Ponto de entrada para a documentação |
| **README do Projeto** | `../README.md` | Introdução ao projeto, stack tecnológica, funcionalidades, estrutura de diretórios, Quick Start | Primeira vez no projeto ou para configurar ambiente |
| **codemap.md** | `../codemap.md` | Mapa completo do repositório com entry points, fluxos principais e arquitetura | Entender a estrutura geral antes de implementar |
| **AGENTS.md** | `../AGENTS.md` | Regras do projeto (pt-BR, mobile-first, offline-first, DDD, testes) | Antes de escrever código ou modificar funcionalidades |

---

## 🛠️ Guias de Configuração

| Documento | Localização | Descrição | Quando Consultar |
|-----------|-------------|-----------|------------------|
| **SUPABASE_SETUP** | `./setup/SUPABASE_SETUP.md` | Criar projeto Supabase, configurar environment, aplicar migrations, seed E2E | Setup inicial de desenvolvimento |
| **STRIPE_CLI_SETUP** | `./setup/STRIPE_CLI_SETUP.md` | Configurar Stripe CLI para webhooks locais, testar pagamentos | Testar pagamentos com cartão em desenvolvimento |
| **MAILPIT_SETUP** | `./setup/MAILPIT_SETUP.md` | Servidor SMTP mock para capturar emails em testes | Testar emails em desenvolvimento |

---

## 📚 Guias Técnicos

| Documento | Localização | Descrição | Quando Consultar |
|-----------|-------------|-----------|------------------|
| **ARCHITECTURE** | `./guides/ARCHITECTURE.md` | Arquitetura DDD em 4 camadas (domain/application/infrastructure/presentation) | Entender a estrutura DDD e regras de dependência |
| **OFFLINE** | `./guides/OFFLINE.md` | Service Worker (Workbox), Dexie (IndexedDB), BackgroundSync, BroadcastChannel | Implementar/modificar funcionalidade offline-first |
| **REALTIME** | `./guides/REALTIME.md` | Supabase Realtime, WebSocket, polling fallback (10s) | Implementar atualizações em tempo real de pedidos |
| **PAYMENTS** | `./guides/PAYMENTS.md` | PIX (Mercado Pago), Stripe (cartão), webhooks, idempotência, modo demo | Implementar/modificar fluxos de pagamento |
| **QR_CODE** | `./guides/QR_CODE.md` | Segurança HMAC-SHA256, validação de QR codes, timestamp expiry | Implementar/modificar sistema de mesas e QR codes |
| **ROLES** | `./guides/ROLES.md` | RBAC, multi-tenant, Row Level Security (RLS), autenticação admin/cliente | Implementar/modificar controle de acesso |
| **MOBILE_PWA** | `./guides/MOBILE_PWA.md` | Mobile-first, PWA, safe areas iOS, CSS responsive, touch targets | Desenvolver UI responsiva e PWA |
| **LIGHTHOUSE** | `./guides/LIGHTHOUSE.md` | Auditoria de performance manual (FCP, LCP, CLS, TTI, PWA, A11y) | Verificar performance e PWA |

---

## 🏗️ Arquitetura & Specs (OpenSpec)

### Specs por Domínio

| Domínio | Localização | Descrição | Quando Consultar |
|---------|-------------|-----------|------------------|
| **Menu** | `../openspec/specs/menu/spec.md` | Cardápio digital, categorias, produtos, filtros dietéticos, busca | Implementar/modificar navegação do cardápio |
| **Cart** | `../openspec/specs/cart/spec.md` | Carrinho de compras, persistência offline, sincronização entre abas | Implementar/modificar carrinho |
| **Order** | `../openspec/specs/order/spec.md` | Criação de pedidos, status, FSM de transições, realtime | Implementar/modificar fluxo de pedidos |
| **Payment** | `../openspec/specs/payment/spec.md` | PIX (Mercado Pago), Stripe, webhooks, idempotência | Implementar/modificar pagamentos |
| **Auth** | `../openspec/specs/auth/spec.md` | Autenticação cliente e admin, roles (owner/manager/staff) | Implementar/modificar autenticação |
| **Admin** | `../openspec/specs/admin/spec.md` | Painel administrativo, CRUD completo | Implementar/modificar painel admin |
| **Table/QR** | `../openspec/specs/table/spec.md` | Mesas, QR codes HMAC-SHA256, validação | Implementar/modificar sistema de mesas |
| **Offline** | `../openspec/specs/offline/spec.md` | Service Worker, IndexedDB, BackgroundSync, BroadcastChannel | Implementar/modificar offline-first |
| **Landing** | `../openspec/specs/landing/spec.md` | Página de marketing, SEO, structured data | Implementar/modificar landing page |
| **SEO** | `../openspec/specs/seo/spec.md` | Metadata, Open Graph, sitemap, robots.txt | Implementar/modificar SEO |
| **Combos** | `../openspec/specs/combos/spec.md` | Sistema de combos com preço bundle | Implementar/modificar combos |
| **Modifier Groups** | `../openspec/specs/modifier-groups/spec.md` | Grupos de modificadores de produtos | Implementar/modificar modificadores |
| **Register** | `../openspec/specs/register/spec.md` | Cadastro de novos usuários/clientes | Implementar/modificar registro |
| **Design System** | `../openspec/specs/design-system/spec.md` | Paleta de cores, tipografia, espaçamento, componentes | Implementar/modificar UI |

### Changes Arquivados (SDD)

| Change | Localização | Descrição |
|--------|-------------|-----------|
| **implantacao-ddd** | `../openspec/changes/archive/2026-04-25-implantacao-ddd/` | Migração para arquitetura DDD (domain/application/infrastructure/presentation) |
| **email-confirmation-template** | `../openspec/changes/archive/2026-04-25-email-confirmation-template/` | Template de email de confirmação |
| **paleta-de-cores-oficial** | `../openspec/changes/archive/2026-04-25-paleta-de-cores-oficial/` | Nova paleta de cores oficial |
| **admin-full-implementation** | `../openspec/changes/archive/2026-04-24-admin-full-implementation/` | Implementação completa do painel admin |
| **correcao-e2e** | `../openspec/changes/archive/2026-04-24-correcao-e2e/` | Correção de testes E2E |
| **melhoria-e2e** | `../openspec/changes/archive/2026-04-24-melhoria-e2e/` | Melhorias nos testes E2E |
| **e2e-mock-pagamentos** | `../openspec/changes/archive/2026-04-24-e2e-mock-pagamentos/` | Mock de pagamentos para E2E |
| **otimizacao-e2e** | `../openspec/changes/archive/2026-04-22-otimizacao-e2e/` | Otimização de testes E2E |
| **correcao-seo** | `../openspec/changes/archive/2026-04-22-correcao-seo/` | Correção de SEO |
| **correcao-offline-first** | `../openspec/changes/archive/2026-04-22-correcao-offline-first/` | Correção de offline-first |
| **correcao-mobile-first-css** | `../openspec/changes/archive/2026-04-22-correcao-mobile-first-css/` | Correção de CSS mobile-first |
| **landing-page** | `../openspec/changes/archive/2026-04-20-landing-page/` | Implementação da landing page |
| **cardapio-digital** | `../openspec/changes/archive/2026-04-20-cardapio-digital/` | Implementação inicial do cardápio digital |
| **implementacao-e2e** | `../openspec/changes/archive/2026-04-22-implementacao-e2e/` | Implementação inicial de E2E |

---

## 🧪 Testes

| Documento | Localização | Descrição | Quando Consultar |
|-----------|-------------|-----------|------------------|
| **E2E README** | `../tests/e2e/README.md` | Visão geral dos testes E2E com Playwright, matriz de cobertura, page objects | Entender como executar e manter E2E |
| **FLUXOS** | `../tests/e2e/FLUXOS.md` | Detalhamento de todos os 19 fluxos E2E (cliente, admin, realtime, kitchen) | Implementar novos testes E2E |

---

## ⚙️ Infraestrutura & DevOps

| Documento | Localização | Descrição | Quando Consultar |
|-----------|-------------|-----------|------------------|
| **E2E Workflow** | `../.github/workflows/e2e.yml` | Pipeline CI/CD do GitHub Actions (shards 1-4, seed, dev server) | Entender/depurar CI de E2E |
| **Pre-Push Workflow** | `../agents/workflows/pre-push.md` | Checklist de validação antes de cada push (tests, lint, seed) | Garantir qualidade antes de commitar |

---

## 📁 Estrutura de Diretórios Docs

```
docs/
├── README.md                  # Hub de documentação (este arquivo é o índice)
├── INDICE.md                 # Índice detalhado (este arquivo)
│
├── setup/                    # Guias de configuração
│   ├── SUPABASE_SETUP.md     # Configuração do Supabase
│   ├── STRIPE_CLI_SETUP.md   # Configuração do Stripe CLI
│   └── MAILPIT_SETUP.md      # Configuração do Mailpit
│
├── guides/                   # Guias técnicos
│   ├── ARCHITECTURE.md       # Arquitetura DDD
│   ├── OFFLINE.md            # Offline-first
│   ├── REALTIME.md           # Realtime subscriptions
│   ├── PAYMENTS.md           # Pagamentos
│   ├── QR_CODE.md            # Segurança de QR Code
│   ├── ROLES.md              # Sistema de funções
│   ├── MOBILE_PWA.md        # Mobile-first e PWA
│   └── LIGHTHOUSE.md         # Auditoria de performance
│
└── archive/                  # Documentação arquivada
    └── UNDOCUMENTED.md       # Features não documentadas (auto-gerado)

Raiz do projeto:
├── README.md                 # Visão geral do projeto
├── AGENTS.md                # Regras de desenvolvimento
├── codemap.md               # Mapa do repositório
│
├── .github/workflows/
│   └── e2e.yml             # Pipeline CI/CD E2E
│
├── agents/workflows/
│   └── pre-push.md         # Workflow pre-push
│
├── openspec/
│   ├── specs/               # Specs por domínio
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── cart/
│   │   ├── combos/
│   │   ├── design-system/
│   │   ├── landing/
│   │   ├── menu/
│   │   ├── modifier-groups/
│   │   ├── offline/
│   │   ├── order/
│   │   ├── payment/
│   │   ├── register/
│   │   ├── seo/
│   │   └── table/
│   └── changes/archive/     # SDDs arquivados
│       ├── 2026-04-25-*/...
│       ├── 2026-04-24-*/...
│       └── 2026-04-22-*/...
│
├── src/
│   ├── app/codemap.md      # Mapa detalhado do App Router
│   ├── components/          # (ver codemap.md)
│   ├── hooks/               # (ver codemap.md)
│   ├── lib/                 # (ver codemap.md)
│   ├── services/            # (ver codemap.md)
│   └── stores/              # (ver codemap.md)
│
└── tests/
    └── e2e/
        ├── README.md        # Visão geral E2E
        └── FLUXOS.md        # Detalhamento dos fluxos
```

---

## 🔍 Quick Reference

### Para iniciantes no projeto:
1. Comece por **README.md** (na raiz) para entender o projeto
2. Leia **AGENTS.md** para conhecer as regras
3. Consulte **codemap.md** para entender a estrutura

### Para configurar ambiente:
1. Execute `pnpm install`
2. Copie `.env.local.example` → `.env.local`
3. Preencha credenciais do Supabase
4. Siga **SUPABASE_SETUP.md** para aplicar migrations
5. (Opcional) Configure Stripe CLI para testes de pagamento
6. (Opcional) Configure Mailpit para testes de email

### Para implementar nova funcionalidade:
1. Crie/atualize o spec em `../openspec/specs/[dominio]/spec.md`
2. Follow o SDD workflow (proposal → design → tasks → verify → archive)
3. Use **ARCHITECTURE.md** para entender a estrutura DDD
4. Execute `pnpm test` e `pnpm test:e2e` antes de commitar

### Para trabalhar com funcionalidades específicas:
| Funcionalidade | Guia Principal | Guias Relacionados |
|----------------|----------------|--------------------|
| Offline/PWA | OFFLINE.md | MOBILE_PWA.md, LIGHTHOUSE.md |
| Pagamentos | PAYMENTS.md | STRIPE_CLI_SETUP.md |
| Sistema de mesas | QR_CODE.md | ROLES.md |
| Realtime | REALTIME.md | PAYMENTS.md |
| Autenticação | ROLES.md | REALTIME.md |

### Para rodar testes:
```bash
# Unit tests
pnpm test

# E2E (requer .env.e2e configurado)
pnpm test:e2e:seed
pnpm test:e2e

# Coverage
pnpm test:coverage
```

### Para verificar performance:
1. `pnpm build` para build de produção
2. Execute Lighthouse manualmente (Chrome DevTools → Lighthouse tab)
3. Verifique Targets em **LIGHTHOUSE.md**

---

## 📌 Notas

- Toda documentação deve estar em **português brasileiro (pt-BR)** conforme `AGENTS.md`
- Documentos em `../openspec/changes/archive/` são **read-only** — não editar
- `archive/UNDOCUMENTED.md` é **auto-gerado** — não editar manualmente
- Para contribuir com nova documentação, edite o arquivo relevante ou crie em `docs/guides/`
