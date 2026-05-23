# Documentação do Pedi-AI

> Sistema de cardápio digital para restaurantes com suporte offline e tempo real.

---

## 📍 Navegação Rápida

### Primeros Passos

| Documento                         | Descrição                                            |
| --------------------------------- | ---------------------------------------------------- |
| [README do Projeto](../README.md) | Visão geral, stack e Quick Start                     |
| [AGENTS.md](../AGENTS.md)         | Regras de desenvolvimento (pt-BR, mobile-first, DDD) |
| [codemap.md](../codemap.md)       | Mapa completo do repositório                         |

### Guias de Configuração

| Documento                                  | Descrição                               | Quando Consultar                 |
| ------------------------------------------ | --------------------------------------- | -------------------------------- |
| [MAILPIT_SETUP.md](setup/MAILPIT_SETUP.md) | Servidor SMTP mock para testes de email | Testar emails em desenvolvimento |

### Guias Técnicos

| Documento                                                   | Descrição                                               | Quando Consultar                                     |
| ----------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| [ARCHITECTURE.md](guides/ARCHITECTURE.md)                   | Arquitetura DDD em 4 camadas                            | Entender estrutura domain/application/infrastructure |
| [OFFLINE.md](guides/OFFLINE.md)                             | Service Worker, Dexie, BackgroundSync, BroadcastChannel | Implementar/modificar funcionalidade offline         |
| [REALTIME.md](guides/REALTIME.md)                           | Socket.io para updates realtime com polling fallback    | Implementar atualizações em tempo real de pedidos    |
| [PAYMENTS.md](guides/PAYMENTS.md)                           | PIX (Mercado Pago), webhooks, idempotência              | Implementar/modificar pagamentos                     |
| [QR_CODE.md](guides/QR_CODE.md)                             | Segurança HMAC-SHA256, validação de QR codes            | Implementar/modificar sistema de mesas               |
| [ROLES.md](guides/ROLES.md)                                 | RBAC, multi-tenant, RLS, autenticação                   | Implementar/modificar controle de acesso             |
| [MOBILE_PWA.md](guides/MOBILE_PWA.md)                       | Mobile-first, PWA, safe areas iOS, CSS                  | Desenvolver UI responsiva                            |
| [LIGHTHOUSE.md](guides/LIGHTHOUSE.md)                       | Auditoria de performance manual                         | Verificar performance e PWA                          |
| [CI_CD.md](guides/CI_CD.md)                                 | GitHub Actions, docker-compose, deploy VPS              | Configurar/modificar pipeline de CI/CD               |
| [DDD_MIGRACAO_API.md](guides/DDD_MIGRACAO_API.md)           | Plano de migração DDD do apps/api                       | Migrar API para arquitetura DDD                      |
| [ESLINT_BEST_PRACTICES.md](guides/ESLINT_BEST_PRACTICES.md) | Regras ESLint, complexity threshold                     | Manter qualidade de código                           |
|| [SOFT_DELETE.md](guides/SOFT_DELETE.md)                     | Soft delete pattern (deletedAt, archived)               | Implementar exclusão reversível                      |
| [PUBLIC_NAVIGATION.md](guides/PUBLIC_NAVIGATION.md)         | Navegação pública vs protegida, middleware              | Implementar rotas públicas e auth                    |

### Fluxos Detalhados

| Documento                                    | Descrição                                        |
| -------------------------------------------- | ------------------------------------------------ |
| [FLUXOS-ADMIM.md](FLUXOS-ADMIM.md)           | Fluxos completos do painel admin                 |
| [FLUXOS-CONSUMIDOR.md](FLUXOS-CONSUMIDOR.md) | Fluxos do cliente (cardápio, carrinho, checkout) |
| [fluxos.html](fluxos.html)                   | Visualização HTML dos fluxos da aplicação        |

### Specs (OpenSpec)

| Domínio | Localização | Descrição |
| ------- | ----------- | --------- |

_(Em construção — specs de domínio serão adicionadas progressivamente)_

### Testes

| Documento  | Localização                       | Descrição                   |
| ---------- | --------------------------------- | --------------------------- |
| E2E README | `../apps/web/tests/e2e/README.md` | Visão geral dos testes E2E  |
| FLUXOS     | `../apps/web/tests/e2e/FLUXOS.md` | Detalhamento dos fluxos E2E |

---

## 📁 Estrutura de Diretórios

```
docs/
├── README.md                      # Este arquivo - hub de navegação
├── INDICE.md                      # Índice completo com todas as referências
├── FLUXOS-ADMIM.md               # Fluxos do painel admin
├── FLUXOS-CONSUMIDOR.md          # Fluxos do cliente
├── fluxos.html                    # Visualização HTML dos fluxos
├── setup/                         # Guias de configuração
│   └── MAILPIT_SETUP.md
└── guides/                        # Guias técnicos
    ├── ARCHITECTURE.md
    ├── CI_CD.md
    ├── DDD_MIGRACAO_API.md
    ├── ESLINT_BEST_PRACTICES.md
    ├── LIGHTHOUSE.md
    ├── MOBILE_PWA.md
    ├── OFFLINE.md
    ├── PAYMENTS.md
    ├── PUBLIC_NAVIGATION.md
    ├── QR_CODE.md
    ├── REALTIME.md
    ├── ROLES.md
    └── SOFT_DELETE.md
```

---

## 🔍 Quando Consultar Cada Guia

### Setup Inicial

```
1. Clone o repositório
2. Execute `pnpm install`
3. Copie `.env.example` → `.env.local`
4. Configure PostgreSQL: DATABASE_URL
5. (Opcional) Configure Mailpit: MAILPIT_SETUP.md
6. Execute `pnpm dev`
```

### Desenvolvendo Nova Funcionalidade

```
1. Leia AGENTS.md para entender as regras do projeto
2. Use ARCHITECTURE.md para entender a estrutura DDD
3. Implemente seguindo as regras de dependência
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
2. Configure Mercado Pago (MERCADO_PAGO_ACCESS_TOKEN)
3. Consulte QR_CODE.md se trabalhar com mesas
```

### Entendendo Autenticação e Permissões

```
1. Consulte ROLES.md para RBAC e multi-tenant
2. Veja REALTIME.md para updates em tempo real de pedidos
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
pnpm test:unit        # Unit tests (126 files, 1549 tests)
pnpm test:coverage    # Coverage report (thresholds: 80%)

# E2E (requer .env.e2e configurado)
pnpm test:e2e:seed   # Seed database
pnpm test:e2e         # Rodar E2E
pnpm test:e2e:smoke   # Smoke tests críticos

# Offline/Pagamentos
pnpm mailpit          # Start Mailpit SMTP server
```

### Variáveis de Ambiente Principais

```bash
# Database
DATABASE_URL=postgresql://user:***@localhost:5432/pedi

# Auth
JWT_SECRET=
JWT_REFRESH_SECRET=

# API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Pagamentos
NEXT_PUBLIC_DEMO_PAYMENT_MODE=true
MERCADO_PAGO_ACCESS_TOKEN=

# QR Code
QR_SECRET_KEY=
```

---

## 📝 Notas

- Toda documentação está em **português brasileiro (pt-BR)** conforme `AGENTS.md`
- Para contribuir com nova documentação, edite o arquivo relevante ou crie em `docs/guides/`
