# Índice de Documentação — Pedi-AI

> Este arquivo serve como índice centralizado para toda a documentação do projeto.
> Utilize Ctrl+F ou navegação por seções para encontrar o que precisa.

---

## 📋 Visão Geral

| Documento             | Localização     | Descrição                                                                                       | Quando Consultar                                      |
| --------------------- | --------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| **README.md**         | `./README.md`   | Hub de documentação, navegação rápida                                                           | Ponto de entrada para a documentação                  |
| **README do Projeto** | `../README.md`  | Introdução ao projeto, stack tecnológica, funcionalidades, estrutura de diretórios, Quick Start | Primeira vez no projeto ou para configurar ambiente   |
| **codemap.md**        | `../codemap.md` | Mapa completo do repositório com entry points, fluxos principais e arquitetura                  | Entender a estrutura geral antes de implementar       |
| **AGENTS.md**         | `../AGENTS.md`  | Regras do projeto (pt-BR, mobile-first, offline-first, DDD, testes)                             | Antes de escrever código ou modificar funcionalidades |

---

## 🛠️ Guias de Configuração

| Documento         | Localização                | Descrição                                                                  | Quando Consultar                   |
| ----------------- | -------------------------- | -------------------------------------------------------------------------- | ---------------------------------- |
| **MAILPIT_SETUP** | `./setup/MAILPIT_SETUP.md` | Servidor SMTP mock para capturar emails em testes                          | Testar emails em desenvolvimento   |
| **FLUXOS (HTML)** | `./fluxos.html`            | Visualização HTML dos fluxos da aplicação (cliente, admin, KDS, PIX, auth) | Entender fluxos de dados e eventos |

---

## 📚 Guias Técnicos

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

---

## 🔄 Fluxos Detalhados

| Documento             | Localização              | Descrição                                                    | Quando Consultar                         |
| --------------------- | ------------------------ | ------------------------------------------------------------ | ---------------------------------------- |
| **FLUXOS-ADMIN**      | `./FLUXOS-ADMIM.md`      | Fluxos completos do administrador (auth, CRUD, pedidos, KDS) | Entender todos os fluxos administrativos |
| **FLUXOS-CONSUMIDOR** | `./FLUXOS-CONSUMIDOR.md` | Fluxos do consumidor (cardápio, carrinho, checkout, PIX)     | Entender a jornada do cliente            |

---

## 🏗️ Arquitetura & Specs (OpenSpec)

### Specs por Domínio

_(Em construção — specs de domínio serão adicionadas progressivamente)_

---

## 🚀 Como Rodar

### Testes

```bash
# Unit tests
pnpm test:unit

# Testes com coverage
pnpm test:coverage

# E2E (requer .env.e2e configurado)
pnpm test:e2e:seed
pnpm test:e2e

# Smoke tests (críticos)
pnpm test:e2e:smoke

# Critical only
pnpm test:e2e:critical
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
