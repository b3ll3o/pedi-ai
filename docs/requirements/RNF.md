# Requisitos Não-Funcionais (RNF) — Pedi-AI

> **Status:** Baseline · **Última atualização:** 2026-06-25 · **Owner:** Time Plataforma
> Versão: 1.0 · Alinhado com **ISO/IEC 25010:2011** (modelo de qualidade de produto de software).

Este documento é a **fonte da verdade** dos requisitos não-funcionais.
Convenção de IDs: `RNF-<CATEG>-<NN>`, definida em [`.openspec/AGENTS.md`](../../.openspec/AGENTS.md).

---

## 1. Sumário por Categoria

| Categoria                | Sigla    | Qtd | Status geral                 |
| ------------------------ | -------- | --- | ---------------------------- |
| Eficiência de desempenho | `PERF`   | 5   | 🟡 3 Done, 2 Parcial         |
| Segurança                | `SEC`    | 5   | 🟡 4 Done, 1 Planejado (2FA) |
| Confiabilidade           | `RELI`   | 4   | ✅ 4 Done                    |
| Disponibilidade          | `AVAIL`  | 2   | 🔴 0 Done, 2 Parcial         |
| Manutenibilidade         | `MAINT`  | 4   | ✅ 4 Done                    |
| Compatibilidade          | `COMPAT` | 3   | ✅ 2 Done, 1 Parcial         |
| Usabilidade              | `USAB`   | 3   | 🟡 2 Done, 1 Parcial         |
| Acessibilidade           | `A11Y`   | 3   | 🟡 2 Done, 1 Parcial         |
| Localização              | `I18N`   | 2   | 🔴 0 Done, 2 Planejado       |
| Conformidade LGPD        | `LGPD`   | 4   | 🔴 0 Done, 4 Planejado       |

> **Done** = implementado e verificável · **Parcial** = parcialmente coberto · **Planejado** = spec escrita, sem implementação ainda.

---

## 2. Eficiência de Desempenho (Performance)

| ID            | Descrição                                      | Limite            | Onde é verificado                           |
| ------------- | ---------------------------------------------- | ----------------- | ------------------------------------------- |
| `RNF-PERF-01` | LCP (Largest Contentful Paint) na landing page | **< 2.5s**        | `docs/guides/LIGHTHOUSE.md` + CI Lighthouse |
| `RNF-PERF-02` | FID (First Input Delay)                        | **< 100ms**       | Lighthouse + vitest web-vitals              |
| `RNF-PERF-03` | CLS (Cumulative Layout Shift)                  | **< 0.1**         | Lighthouse                                  |
| `RNF-PERF-04` | Bundle inicial (First Load JS)                 | **< 150 kB gzip** | `next build` + `LIGHTHOUSE.md`              |
| `RNF-PERF-05` | Latência p95 `GET /api/menu`                   | **< 300ms**       | (a instrumentar — ver `RNF-OBS-01`)         |
| `RNF-PERF-06` | Latência p95 `POST /api/orders`                | **< 800ms**       | (a instrumentar)                            |

**Notas**:

- `RNF-PERF-05` e `RNF-PERF-06` **não estão instrumentados** — dependem de `RNF-OBS-01`.

---

## 3. Segurança (Security)

| ID           | Descrição                                                              | Implementação atual                                                      |
| ------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `RNF-SEC-01` | Senhas armazenadas com **bcrypt cost ≥ 10**                            | `apps/api/src/auth/auth.service.ts` (legado)                             |
| `RNF-SEC-02` | Rate limiting em `POST /api/auth/login` (5 tentativas/10min/IP)        | ❌ Não implementado                                                      |
| `RNF-SEC-03` | QR Code anti-falsificação com **HMAC-SHA256** + timestamp + janela 24h | `apps/web/src/lib/qr/validator.ts` (RFC 3174 + docs)                     |
| `RNF-SEC-04` | Webhook Mercado Pago valida assinatura HMAC                            | `apps/web/src/application/pagamento/services/ProcessarWebhookUseCase.ts` |
| `RNF-SEC-05` | **2FA (TOTP) para `owner`**                                            | ⏸️ Planejado Q1/2027 — sem implementação                                 |

**Notas**:

- `RNF-SEC-02` precisa ser adicionado antes de qualquer release em produção.
- `RNF-SEC-05` está marcado como "planejado" pois **não há RF correspondente** ainda.

---

## 4. Confiabilidade (Reliability)

| ID            | Descrição                                                                            | Implementação                                          |
| ------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `RNF-RELI-01` | **Idempotência de webhooks** via tabela `WebhookEvent` (DB)                          | `apps/api/prisma/schema.prisma` (model `WebhookEvent`) |
| `RNF-RELI-02` | Cobertura de testes unitários ≥ **80%** (todas as 4 métricas)                        | `vitest.config.ts` + `AGENTS.md §Qualidade & Testes`   |
| `RNF-RELI-03` | Pipeline E2E **bloqueia merge** se algum teste falhar                                | `.github/workflows/e2e-vps.yml`                        |
| `RNF-RELI-04` | **Soft delete** para entidades com histórico (Restaurante, Mesa, Categoria, Produto) | `apps/web/src/domain/**/entities/`                     |

---

## 5. Disponibilidade (Availability)

| ID             | Descrição                                                                   | Status                                               |
| -------------- | --------------------------------------------------------------------------- | ---------------------------------------------------- |
| `RNF-AVAIL-01` | SLO mensal de uptime da **api** ≥ 99.5%                                     | 🔴 Sem monitoria                                     |
| `RNF-AVAIL-02` | Modo **offline-first** no cliente (Service Worker + Dexie + BackgroundSync) | ✅ `docs/guides/OFFLINE.md` + `apps/web/src/lib/sw/` |

**Notas**:

- `RNF-AVAIL-01` requer infraestrutura de monitoria (a definir: BetterStack, Sentry, OpenStatus).

---

## 6. Manutenibilidade (Maintainability)

| ID             | Descrição                                                        | Onde                         |
| -------------- | ---------------------------------------------------------------- | ---------------------------- |
| `RNF-MAINT-01` | Arquitetura DDD estrita (camadas + bounded contexts)             | `AGENTS.md §Arquitetura DDD` |
| `RNF-MAINT-02` | Idioma único: **português brasileiro** em código/UI/mensagens    | `AGENTS.md §Idioma`          |
| `RNF-MAINT-03` | Comentários `@spec(RF-XXX-NN)` ligam código a requisitos formais | `.openspec/AGENTS.md §6`     |
| `RNF-MAINT-04` | Conventional Commits + Husky + lint-staged                       | `package.json`, `.husky/`    |

---

## 7. Compatibilidade (Compatibility)

| ID              | Descrição                                                                   | Status                           |
| --------------- | --------------------------------------------------------------------------- | -------------------------------- |
| `RNF-COMPAT-01` | Browsers suportados: **últimas 2 versões** de Chrome, Safari, Firefox, Edge | ✅ `docs/guides/MOBILE_PWA.md`   |
| `RNF-COMPAT-02` | Mobile-first: base < 640px; tablet 640-1024px; desktop > 1024px             | ✅ `AGENTS.md §Mobile-First`     |
| `RNF-COMPAT-03` | PWA instalável (manifest.json + service worker + 100% Lighthouse PWA)       | 🟡 Score 100 não garantido ainda |

---

## 8. Usabilidade (Usability)

| ID            | Descrição                                         | Status                                  |
| ------------- | ------------------------------------------------- | --------------------------------------- |
| `RNF-USAB-01` | Touch targets mínimo **44×44px**                  | ✅ `AGENTS.md §Mobile-First`            |
| `RNF-USAB-02` | Feedback visual de conectividade (online/offline) | ✅ Banner em `apps/web/src/components/` |
| `RNF-USAB-03` | Lighthouse Accessibility score entre 85-95        | 🟡 A verificar                          |

---

## 9. Acessibilidade (Accessibility)

| ID            | Descrição                                                          | Status                         |
| ------------- | ------------------------------------------------------------------ | ------------------------------ |
| `RNF-A11Y-01` | HTML semântico (heading hierarchy, landmarks, `<button>` vs `<a>`) | ✅ `AGENTS.md §HTML Semântico` |
| `RNF-A11Y-02` | `aria-label` em ícones interativos e navegação                     | ✅ Auditoria manual em PR      |
| `RNF-A11Y-03` | Conformidade **WCAG 2.1 nível AA**                                 | 🟡 Sem checklist automatizado  |

**Tarefa pendente**: integrar `@axe-core/playwright` em uma spec E2E para detectar regressões.

---

## 10. Localização (Localization)

| ID            | Descrição                                          | Status                              |
| ------------- | -------------------------------------------------- | ----------------------------------- |
| `RNF-I18N-01` | Idioma padrão: **pt-BR**                           | ✅ `AGENTS.md §Idioma`              |
| `RNF-I18N-02` | Roadmap de i18n (es/en) com `next-intl` ou similar | ⏸️ Planejado Q4/2026 — sem RF atual |

**Notas**:

- O `AGENTS.md` declara **pt-BR como regra absoluta**. Qualquer evolução para multi-idioma exige:
  1. Adoção de framework de i18n (`next-intl` é o candidato).
  2. Refactor das strings hardcoded.
  3. Spec formal `RF-I18N-01` (a definir).

---

## 11. Conformidade LGPD

> ⚠️ **Gap crítico**: nenhuma menção a LGPD no código ou docs atuais.

| ID            | Descrição                                                                   | Status               |
| ------------- | --------------------------------------------------------------------------- | -------------------- |
| `RNF-LGPD-01` | Política de **retenção de pedidos** (24 meses; depois, anonimizar)          | 🔴 Sem implementação |
| `RNF-LGPD-02` | **Direito ao esquecimento**: endpoint `DELETE /api/users/me/data`           | 🔴 Sem implementação |
| `RNF-LGPD-03` | **Exportação de dados** do cliente (Art. 18, V): `GET /api/users/me/export` | 🔴 Sem implementação |
| `RNF-LGPD-04` | **Consentimento explícito** para cookies não-essenciais (LGPD Art. 8)       | 🟡 Sem banner        |

**Tarefa**: priorizar `RNF-LGPD-01..04` antes de qualquer release em produção brasileira.

---

## 12. Observabilidade (Observability — transversal)

| ID           | Descrição                                            | Status                                                                         |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `RNF-OBS-01` | Tracing distribuído api ↔ web (OpenTelemetry)        | ⏸️ Planejado — **não implementado**                                            |
| `RNF-OBS-02` | Logs estruturados em pt-BR para operações de negócio | 🟡 Parcial — convenção existe (`AGENTS.md §apps/api Regras`) mas sem validador |

**Notas**:

- O `CLAUDE.md` menciona OpenTelemetry, mas o `AGENTS.md` e o código **não** usam. Ver `.openspec/specs/admin/tasks.md` §2 para decisão.

---

## 13. Apêndice — Próximas Ações

| Ação                                             | Owner sugerido    | Quarter |
| ------------------------------------------------ | ----------------- | ------- |
| Implementar `RNF-SEC-02` (rate limit)            | Time Auth         | Q3/2026 |
| Implementar `RNF-LGPD-01..04`                    | Time Auth + Admin | Q3/2026 |
| Instrumentar `RNF-PERF-05/06` (latência de API)  | Time Plataforma   | Q4/2026 |
| Decidir SLO `RNF-AVAIL-01` + escolher ferramenta | Time Plataforma   | Q4/2026 |
| Avaliar `RNF-SEC-05` (2FA) com squad             | Owner + Auth      | Q1/2027 |
| Roadmap i18n (`RNF-I18N-02`)                     | Time Plataforma   | Q4/2026 |
