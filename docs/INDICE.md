# Índice de Documentação — Pedi-AI

> Este arquivo serve como índice centralizado para toda a documentação do projeto.
> Utilize Ctrl+F ou navegação por seções para encontrar o que precisa.

---

## 📋 Visão Geral

| Documento             | Localização              | Descrição                                                                                                                                                               | Quando Consultar                                        |
| --------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **README do Projeto** | `../README.md`           | Introdução ao projeto, stack tecnológica, funcionalidades, estrutura de diretórios, Quick Start                                                                         | Primeira vez no projeto ou para configurar ambiente     |
| **codemap.md**        | `../codemap.md`          | Mapa completo do repositório com entry points, fluxos principais e arquitetura                                                                                          | Entender a estrutura geral antes de implementar         |
| **AGENTS.md**         | `../AGENTS.md`           | Regras do projeto (pt-BR, mobile-first, offline-first, DDD, testes)                                                                                                     | Antes de escrever código ou modificar funcionalidades   |
| **CLAUDE.md**         | `../CLAUDE.md`           | Guia do Claude Code neste repositório (comandos, padrões)                                                                                                               | Configurar ambiente Claude Code                         |
| **PROJECT_CONTEXT**   | `./PROJECT_CONTEXT.md`   | Contexto amplo do projeto (histórico, missão, público-alvo, modelo de negócio)                                                                                          | Onboarding de novos membros ou contextualizar decisões  |
| **COMPANY**           | `./COMPANY.md`           | Informações da empresa (nome legal, missão, visão, valores, OKRs, posicionamento de mercado)                                                                            | Decisões de produto que dependem de contexto de negócio |
| **PO-SKILLS**         | `./PO-SKILLS.md`         | Habilidades e competências do agente `analista-requisitos` (PO técnico automatizado) — frameworks de priorização, métricas SaaS, categorias de análise, templates de PR | Instanciar o agente PO ou calibrar revisão de PRs       |
| **PO-AGENT-PLAYBOOK** | `./PO-AGENT-PLAYBOOK.md` | Versão operacional e compacta do PO-SKILLS — roteiro diário, checklist de PR, tom de voz, sinais de alarme                                                              | Usar como prompt-base ao rodar o agente                 |

---

## 🛠️ Guias de Configuração

| Documento         | Localização                | Descrição                                                                  | Quando Consultar                   |
| ----------------- | -------------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| **MAILPIT_SETUP** | `./setup/MAILPIT_SETUP.md` | Servidor SMTP mock para capturar emails em testes                          | Testar emails em desenvolvimento   |
| **FLUXOS (HTML)** | `./fluxos.html`            | Visualização HTML dos fluxos da aplicação (cliente, admin, KDS, PIX, auth) | Entender fluxos de dados e eventos |

---

## 📚 Guias Técnicos (`./guides/`)

| Documento                 | Localização                         | Descrição                                                                             | Quando Consultar                                   |
| ------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **ARCHITECTURE**          | `./guides/ARCHITECTURE.md`          | Arquitetura DDD em 4 camadas (domain/application/infrastructure/presentation)         | Entender a estrutura DDD e regras de dependência   |
| **OFFLINE**               | `./guides/OFFLINE.md`               | Service Worker (Workbox), Dexie (IndexedDB), BackgroundSync, BroadcastChannel         | Implementar/modificar funcionalidade offline-first |
| **REALTIME**              | `./guides/REALTIME.md`              | Socket.io para updates realtime com polling fallback                                  | Implementar atualizações em tempo real de pedidos  |
| **PAYMENTS**              | `./guides/PAYMENTS.md`              | PIX (Mercado Pago), webhooks, idempotência, modo demo                                 | Implementar/modificar fluxos de pagamento          |
| **QR_CODE**               | `./guides/QR_CODE.md`               | Segurança HMAC-SHA256, validação de QR codes, timestamp expiry                        | Implementar/modificar sistema de mesas e QR codes  |
| **ROLES**                 | `./guides/ROLES.md`                 | RBAC, multi-tenant, Row Level Security (RLS), autenticação admin/cliente              | Implementar/modificar controle de acesso           |
| **MOBILE_PWA**            | `./guides/MOBILE_PWA.md`            | Mobile-first, PWA, safe areas iOS, CSS responsive, touch targets                      | Desenvolver UI responsiva e PWA                    |
| **LIGHTHOUSE**            | `./guides/LIGHTHOUSE.md`            | Auditoria de performance manual (FCP, LCP, CLS, TTI, PWA, A11y)                       | Verificar performance e PWA                        |
| **CI_CD**                 | `./guides/CI_CD.md`                 | GitHub Actions, docker-compose, deploy VPS, testes E2E em CI                          | Configurar/modificar pipeline de CI/CD             |
| **SOFT_DELETE**           | `./guides/SOFT_DELETE.md`           | Implementação de soft delete (deletedAt, archived status)                             | Implementar/modificar exclusão reversível          |
| **DDD_MIGRACAO_API**      | `./guides/DDD_MIGRACAO_API.md`      | Plano de migração da API NestJS para arquitetura DDD (bounded contexts, status atual) | Migrar módulos da API para DDD                     |
| **ESLINT_BEST_PRACTICES** | `./guides/ESLINT_BEST_PRACTICES.md` | Regras ESLint, complexity threshold, patterns e anti-patterns                         | Manter qualidade de código                         |
| **PUBLIC_NAVIGATION**     | `./guides/PUBLIC_NAVIGATION.md`     | Navegação pública vs protegida, middleware de autenticação,redirects                  | Implementar rotas públicas e auth middleware       |
| **FEATURE_FLAGS**         | `./guides/FEATURE_FLAGS.md`         | Feature flags runtime DB-backed, precedência, rollout %, RBAC, SDK, audit log         | Operar painel admin ou consumir flag no front/back |

---

## 🔄 Fluxos Detalhados

| Documento             | Localização              | Descrição                                                    | Quando Consultar                         |
| --------------------- | ------------------------ | ------------------------------------------------------------ | ---------------------------------------- |
| **FLUXOS-ADMIN**      | `./FLUXOS-ADMIM.md`      | Fluxos completos do administrador (auth, CRUD, pedidos, KDS) | Entender todos os fluxos administrativos |
| **FLUXOS-CONSUMIDOR** | `./FLUXOS-CONSUMIDOR.md` | Fluxos do consumidor (cardápio, carrinho, checkout, PIX)     | Entender a jornada do cliente            |

---

## 🚀 Deploy & Observabilidade

| Documento             | Localização                        | Descrição                                                                                     | Quando Consultar                          |
| --------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **DEPLOY (legado)**   | `./DEPLOY.md`                      | ⚠️ Plano antigo (Vercel + Fly.io). Substituído por **`./CI-CD.md`** + **`./guides/CI_CD.md`** | Apenas referência histórica               |
| **CI-CD**             | `./CI-CD.md`                       | Workflows GitHub Actions (lint, type-check, testes, E2E, deploy VPS)                          | Configurar/ajustar workflows de CI        |
| **DATA-TESTID**       | `./DATA-TESTID.md`                 | Convenção `data-testid` para Playwright + script `scripts/add-data-testids.js`                | Adicionar testids estáveis em componentes |
| **GRAFANA-CLOUD**     | `./GRAFANA-CLOUD.md`               | Grafana Cloud (métricas, logs, traces) + k6 Cloud                                             | Setup de observabilidade em produção      |
| **grafana-dashboard** | `./grafana-dashboard-pedi-ai.json` | Dashboard Grafana pré-configurado (importar no Grafana Cloud)                                 | Visualizar métricas de produção           |

---

## 📦 Auditorias e Planos (`./auditorias/`)

| Documento                                     | Descrição                                                                                            |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **AUDITORIA-GERAL-LINHA-BASE-2026-07-29**     | Linha-base de auditoria completa do projeto (P0/P1/P2)                                               |
| **AUDITORIA-2026-07-29-FASES-1-4-RESULTADOS** | Resultados das fases 1-4 da auditoria de 2026-07-29                                                  |
| **DEVSECOPS-AUDIT-2026-06-25**                | Auditoria DevSecOps (segurança, compliance, hardening)                                               |
| **PLANO_AUDITORIA_2026-07-29**                | Plano de auditoria que originou a linha-base (P0/P1/P2)                                              |
| **MIGRACAO_POSTGRES**                         | Histórico completo da migração Supabase/Drizzle → PostgreSQL nativo + NestJS + Prisma (✅ concluída) |

---

## 📋 Planos em Curso (`./plans/`)

| Documento                         | Descrição                                                     |
| --------------------------------- | ------------------------------------------------------------- |
| **LGPD-BACKLOG-2026-08-03**       | Backlog de tarefas LGPD pendentes                             |
| **OBSERVABILITY-REVISION**        | Revisão do stack de observabilidade (OTel + Grafana + Sentry) |
| **register-infinite-loading-fix** | Plano de correção do loading infinito na tela de cadastro     |

---

## ✅ QA & Testes (`./qa/`)

| Documento                   | Descrição                                               |
| --------------------------- | ------------------------------------------------------- |
| **bdd-runner-decision**     | Decisão de runner BDD (Cucumber-js vs alternatives)     |
| **feature-flags-test-plan** | Plano de testes para o sistema de feature flags runtime |

---

## 📜 Requisitos (`./requirements/`)

| Documento | Descrição                                                           |
| --------- | ------------------------------------------------------------------- |
| **RNF**   | Requisitos não-funcionais (performance, segurança, disponibilidade) |
| **RTM**   | Requirements Traceability Matrix (RF/RNF ↔ testes ↔ código)         |

---

## 🔧 Runbooks Operacionais (`./runbooks/`)

| Documento             | Descrição                                                |
| --------------------- | -------------------------------------------------------- |
| **api-down**          | Procedimento quando a API está fora do ar                |
| **high-p95**          | Procedimento quando latência p95 sobe acima do SLO       |
| **pix-failure-spike** | Procedimento em caso de pico de falhas em transações PIX |

---

## 🧠 Superpowers (`.claude` Agents & Plans)

> Documentos gerados durante uso dos agentes Claude do projeto. Não fazem parte do produto final.

| Documento                                                               | Descrição                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `./superpowers/plans/2026-06-26-feature-flags-frontend-completo.md`     | Plano completo da feature de feature-flags no frontend |
| `./superpowers/plans/2026-06-27-processar-backlog-dependabot.md`        | Plano para processar backlog do Dependabot             |
| `./superpowers/plans/2026-07-29-auditoria-linha-base.md`                | Plano da auditoria linha-base                          |
| `./superpowers/plans/2026-07-29-auditoria-tranche-a-p0.md`              | Tranche A (P0) da auditoria                            |
| `./superpowers/specs/2026-06-26-analista-frontend-design.md`            | Spec do agente analista-frontend                       |
| `./superpowers/specs/2026-06-27-processar-backlog-dependabot-design.md` | Spec do plano Dependabot                               |
| `./superpowers/specs/2026-07-28-auditoria-limpeza-geral-design.md`      | Spec de auditoria de limpeza geral                     |

---

## 🏗️ Arquitetura & Specs (OpenSpec)

As specs por domínio vivem em `.openspec/specs/<bounded-context>/` e são
geradas pelos planos de feature. Ver `.openspec/AGENTS.md` para o workflow
oficial.

---

## 🚀 Como Rodar

### Testes

```bash
# Unit tests (Vitest)
pnpm test              # Todos os testes unitários
pnpm test:watch       # Watch mode
pnpm test:coverage    # Com coverage report (≥80%)
pnpm test:unit        # Apenas unitários
pnpm test:integration # Apenas integração
pnpm test:ui          # Vitest UI

# E2E (requer docker-compose.dev.yml up)
pnpm test:e2e:seed      # Popula banco de dados
pnpm test:e2e           # Headless
pnpm test:e2e:ui       # Com UI
pnpm test:e2e:smoke    # Smoke tests
pnpm test:e2e:critical  # Critical path
pnpm test:e2e:fast      # Fast tests
pnpm test:e2e:cleanup   # Cleanup dados
pnpm test:all           # Unit + Integration + E2E
```

### Performance

1. `pnpm build` para build de produção
2. Execute Lighthouse manualmente (Chrome DevTools → Lighthouse tab)
3. Verifique Targets em **LIGHTHOUSE.md**

### Lint e TypeScript

```bash
pnpm lint        # Lint web + api
pnpm exec tsc    # TypeScript check
pnpm test:unit   # Rodar todos os testes unitários
```

---

## 📌 Notas

- Toda documentação deve estar em **português brasileiro (pt-BR)** conforme `AGENTS.md`
- Para contribuir com nova documentação, edite o arquivo relevante ou crie em `docs/guides/`
