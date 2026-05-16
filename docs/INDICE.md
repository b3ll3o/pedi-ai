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

| Documento            | Localização                   | Descrição                                                                    | Quando Consultar                                |
| -------------------- | ----------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| **STRIPE_CLI_SETUP** | `./setup/STRIPE_CLI_SETUP.md` | Configurar Stripe CLI para webhooks locais, testar pagamentos                | Testar pagamentos com cartão em desenvolvimento |
| **MAILPIT_SETUP**     | `./setup/MAILPIT_SETUP.md`     | Servidor SMTP mock para capturar emails em testes                            | Testar emails em desenvolvimento                |

---

## 📚 Guias Técnicos

| Documento        | Localização                | Descrição                                                                     | Quando Consultar                                   |
| ---------------- | -------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| **ARCHITECTURE** | `./guides/ARCHITECTURE.md` | Arquitetura DDD em 4 camadas (domain/application/infrastructure/presentation) | Entender a estrutura DDD e regras de dependência   |
| **OFFLINE**      | `./guides/OFFLINE.md`      | Service Worker (Workbox), Dexie (IndexedDB), BackgroundSync, BroadcastChannel | Implementar/modificar funcionalidade offline-first |
| **REALTIME**     | `./guides/REALTIME.md`     | Supabase Realtime, WebSocket, polling fallback (10s)                          | Implementar atualizações em tempo real de pedidos  |
| **PAYMENTS**     | `./guides/PAYMENTS.md`     | PIX (Mercado Pago), Stripe (cartão), webhooks, idempotência, modo demo        | Implementar/modificar fluxos de pagamento          |
| **QR_CODE**      | `./guides/QR_CODE.md`      | Segurança HMAC-SHA256, validação de QR codes, timestamp expiry                | Implementar/modificar sistema de mesas e QR codes  |
| **ROLES**        | `./guides/ROLES.md`        | RBAC, multi-tenant, Row Level Security (RLS), autenticação admin/cliente      | Implementar/modificar controle de acesso           |
| **MOBILE_PWA**   | `./guides/MOBILE_PWA.md`   | Mobile-first, PWA, safe areas iOS, CSS responsive, touch targets              | Desenvolver UI responsiva e PWA                    |
| **LIGHTHOUSE**   | `./guides/LIGHTHOUSE.md`   | Auditoria de performance manual (FCP, LCP, CLS, TTI, PWA, A11y)               | Verificar performance e PWA                        |
| **ORGANIZACAO**  | `./guides/ORGANIZACAO.md`  | Hierarquia de agentes IA, CTO, reporting, fluxo de trabalho                   | Entender estrutura organizacional                  |

---

## 🏗️ Arquitetura & Specs (OpenSpec)

### Specs por Domínio

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
- `archive/UNDOCUMENTED.md` é **auto-gerado** — não editar manualmente
- Para contribuir com nova documentação, edite o arquivo relevante ou crie em `docs/guides/`
