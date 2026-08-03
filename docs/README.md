# Documentação do Pedi-AI

> Sistema de cardápio digital para restaurantes com suporte offline e tempo real.

Para o índice completo com descrições detalhadas de cada documento, consulte
**[docs/INDICE.md](./INDICE.md)**.

---

## 📍 Navegação Rápida

### Primeiros Passos

| Documento                         | Descrição                                            |
| --------------------------------- | ---------------------------------------------------- |
| [README do Projeto](../README.md) | Visão geral, stack e Quick Start                     |
| [AGENTS.md](../AGENTS.md)         | Regras de desenvolvimento (pt-BR, mobile-first, DDD) |
| [codemap.md](../codemap.md)       | Mapa completo do repositório                         |
| [INDICE.md](./INDICE.md)          | Índice completo desta documentação                   |

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
| [SOFT_DELETE.md](guides/SOFT_DELETE.md)                     | Soft delete pattern (deletedAt, archived)               | Implementar exclusão reversível                      |
| [PUBLIC_NAVIGATION.md](guides/PUBLIC_NAVIGATION.md)         | Navegação pública vs protegida, middleware              | Implementar rotas públicas e auth                    |
| [FEATURE_FLAGS.md](guides/FEATURE_FLAGS.md)                 | Feature flags runtime DB-backed, precedência, RBAC      | Operar painel admin ou consumir flag no front/back   |

### Deploy & Observabilidade

| Documento                                                        | Descrição                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| [CI-CD.md](CI-CD.md)                                             | Workflows GitHub Actions (lint, type-check, E2E, deploy) |
| [DATA-TESTID.md](DATA-TESTID.md)                                 | Convenção `data-testid` para Playwright + script         |
| [GRAFANA-CLOUD.md](GRAFANA-CLOUD.md)                             | Grafana Cloud + k6 Cloud                                 |
| [grafana-dashboard-pedi-ai.json](grafana-dashboard-pedi-ai.json) | Dashboard Grafana pré-configurado (importar)             |

### Fluxos Detalhados

| Documento                                    | Descrição                                        |
| -------------------------------------------- | ------------------------------------------------ |
| [FLUXOS-ADMIM.md](FLUXOS-ADMIM.md)           | Fluxos completos do painel admin                 |
| [FLUXOS-CONSUMIDOR.md](FLUXOS-CONSUMIDOR.md) | Fluxos do cliente (cardápio, carrinho, checkout) |
| [fluxos.html](fluxos.html)                   | Visualização HTML dos fluxos da aplicação        |

### Auditorias

| Documento                                                                                                          | Descrição                                   |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| [auditorias/AUDITORIA-GERAL-LINHA-BASE-2026-07-29.md](auditorias/AUDITORIA-GERAL-LINHA-BASE-2026-07-29.md)         | Linha-base de auditoria completa (P0/P1/P2) |
| [auditorias/AUDITORIA-2026-07-29-FASES-1-4-RESULTADOS.md](auditorias/AUDITORIA-2026-07-29-FASES-1-4-RESULTADOS.md) | Resultados das fases 1-4                    |
| [auditorias/DEVSECOPS-AUDIT-2026-06-25.md](auditorias/DEVSECOPS-AUDIT-2026-06-25.md)                               | Auditoria DevSecOps                         |

### Requisitos & Runbooks

| Documento                                                      | Descrição                                  |
| -------------------------------------------------------------- | ------------------------------------------ |
| [requirements/RNF.md](requirements/RNF.md)                     | Requisitos não-funcionais                  |
| [requirements/RTM.md](requirements/RTM.md)                     | Requirements Traceability Matrix           |
| [runbooks/api-down.md](runbooks/api-down.md)                   | Procedimento quando a API está fora do ar  |
| [runbooks/high-p95.md](runbooks/high-p95.md)                   | Procedimento quando latência p95 sobe      |
| [runbooks/pix-failure-spike.md](runbooks/pix-failure-spike.md) | Procedimento em caso de pico de falhas PIX |

### Specs (OpenSpec)

As specs por domínio vivem em `.openspec/specs/<bounded-context>/` e são geradas
pelos planos de feature. Ver `.openspec/AGENTS.md` para o workflow oficial.

---

## 📁 Estrutura de Diretórios

```
docs/
├── README.md                      # Este arquivo - hub de navegação
├── INDICE.md                      # Índice completo com descrições detalhadas
├── FLUXOS-ADMIM.md               # Fluxos do painel admin
├── FLUXOS-CONSUMIDOR.md          # Fluxos do cliente
├── fluxos.html                    # Visualização HTML dos fluxos
├── CI-CD.md                       # Workflows GitHub Actions
├── DATA-TESTID.md                 # Convenção data-testid
├── DEPLOY.md                      # ⚠️ Legado (Vercel + Fly.io) — ver CI-CD.md
├── GRAFANA-CLOUD.md               # Grafana Cloud + k6 Cloud
├── grafana-dashboard-pedi-ai.json # Dashboard Grafana (importar)
├── PROJECT_CONTEXT.md             # Contexto amplo do projeto
├── COMPANY.md                     # Informações da empresa
├── PO-SKILLS.md                   # Skills do agente PO
├── PO-AGENT-PLAYBOOK.md           # Playbook operacional do agente PO
├── setup/                         # Guias de configuração
│   └── MAILPIT_SETUP.md
├── guides/                        # Guias técnicos
│   ├── ARCHITECTURE.md
│   ├── CI_CD.md
│   ├── DDD_MIGRACAO_API.md
│   ├── ESLINT_BEST_PRACTICES.md
│   ├── FEATURE_FLAGS.md
│   ├── LIGHTHOUSE.md
│   ├── MOBILE_PWA.md
│   ├── OFFLINE.md
│   ├── PAYMENTS.md
│   ├── PUBLIC_NAVIGATION.md
│   ├── QR_CODE.md
│   ├── REALTIME.md
│   ├── ROLES.md
│   └── SOFT_DELETE.md
├── auditorias/                    # Auditorias e migrações históricas
├── plans/                         # Planos em curso
├── qa/                            # Planos de QA & testes
├── requirements/                  # RF, RNF, RTM
├── runbooks/                      # Runbooks operacionais
└── superpowers/                   # Specs/planos gerados pelos agentes Claude
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

# Tests unitários (Vitest)
pnpm test              # Todos os testes unitários
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report (≥80%)
pnpm test:unit         # Unit tests
pnpm test:integration  # Integração
pnpm test:ui          # Vitest UI

# E2E (requer docker-compose.dev.yml up)
pnpm test:e2e:seed    # Seed database
pnpm test:e2e          # Headless
pnpm test:e2e:ui      # Com UI
pnpm test:e2e:smoke   # Smoke tests
pnpm test:e2e:critical # Critical path

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
