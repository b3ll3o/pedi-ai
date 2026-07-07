# 🧪 Testes E2E — Fluxo Completo PediAI

**Última atualização:** 06 de julho de 2026

Documentação da suite de testes E2E (Playwright) que cobre **o ciclo de vida completo** do PediAI: do signup até a entrega do pedido + analytics + LGPD.

---

## 📊 Visão Geral

| Categoria | Spec | Cobertura | Tags |
|---|---|---|---|
| **Fluxo completo** | `tests/flow/complete-order-flow.spec.ts` | Admin → Cardápio → Pedido → PIX → Cozinha → Analytics | `@critical @full-flow` |
| **Onboarding** | `tests/onboarding/onboarding-wizard.spec.ts` | Wizard 4 steps + validações + persistência | `@critical @onboarding` |
| **Billing** | `tests/billing/subscription.spec.ts` | Trial, checkout, webhook idempotente, anti-bypass | `@critical @billing` |
| **Analytics** | `tests/analytics/dashboard.spec.ts` | Faturamento, ranking, performance | `@analytics @critical` |
| **LGPD** | `tests/lgpd/compliance.spec.ts` | Cookie banner, termos, privacidade, anti-PII | `@lgpd @compliance` |
| **Smoke** | `tests/smoke.spec.ts` | Validação rápida pós-deploy | `@critical @smoke` |

**Total:** ~25 testes E2E cobrindo 8 fluxos críticos.

---

## 🚀 Como rodar

### Local (modo dev)

```bash
# 1. Subir stack completa (Postgres + API + Web)
docker-compose up -d

# 2. Subir migrations + seed
pnpm db:migrate
pnpm db:seed

# 3. Rodar testes E2E (em outro terminal)
pnpm test:e2e:smoke         # só smoke tests (~30s)
pnpm test:e2e:critical      # só críticos (~2min)
pnpm test:e2e               # tudo (~10min)

# Modo UI (debug)
pnpm test:e2e:ui

# Modo headed (assistir execução)
pnpm test:e2e:headed
```

### CI/CD

```yaml
# .github/workflows/e2e.yml
- name: Run E2E Smoke
  run: pnpm test:e2e:smoke
- name: Run E2E Critical
  if: github.ref == 'refs/heads/master'
  run: pnpm test:e2e:critical
```

### Filtrar por tag

```bash
# Só testes críticos
pnpm test:e2e --grep "@critical"

# Só billing
pnpm test:e2e --grep "@billing"

# Excluir testes lentos (smoke de carga)
pnpm test:e2e --grepInvert="@slow"
```

---

## 🏗️ Estrutura

```
apps/web/tests/e2e/
├── pages/                          # Page Objects
│   ├── OnboardingPage.ts           # Wizard de 4 steps
│   ├── AdminProductsPage.ts        # CRUD de produtos
│   ├── AdminBillingPage.ts         # Assinatura SaaS
│   ├── AdminAnalyticsPage.ts       # Dashboard analytics
│   ├── CheckoutPage.ts             # (existente)
│   ├── KitchenPage.ts              # (existente)
│   └── ... (outros 20+ pages)
│
├── tests/
│   ├── flow/
│   │   └── complete-order-flow.spec.ts   # ← NOVO: ciclo completo
│   ├── onboarding/
│   │   └── onboarding-wizard.spec.ts     # ← NOVO
│   ├── billing/
│   │   └── subscription.spec.ts          # ← NOVO
│   ├── analytics/
│   │   └── dashboard.spec.ts             # ← NOVO
│   ├── lgpd/
│   │   └── compliance.spec.ts            # ← NOVO
│   ├── smoke.spec.ts                     # ← NOVO
│   ├── payment/                          # (existente)
│   ├── kitchen/                          # (existente)
│   └── customer/                         # (existente)
│
├── shared/
│   ├── fixtures/                   # Fixtures Playwright
│   └── helpers/                    # Helpers (orderUtils, api, etc)
│
└── scripts/
    ├── seed.ts                     # Cria dados de teste
    └── cleanup.ts                   # Limpa dados após testes
```

---

## 📋 Padrões usados

### 1. **Page Object Model (POM)**

Cada página tem uma classe com:
- **Locators** (seletores `data-testid`)
- **Actions** (métodos de interação)
- **Assertions** (métodos `expectX`)

**Exemplo:**
```ts
const onboarding = new OnboardingPage(page);
await onboarding.goto();
await onboarding.selectVertical('pizzaria');
await onboarding.clickNext();
```

### 2. **Fixtures (test extension)**

```ts
test('exemplo', async ({ admin, authenticated, seedData }) => {
  // admin: Page já logado como admin
  // authenticated: Page já logado como cliente
  // seedData: { restaurant, customer, admin, products, ... }
});
```

### 3. **Tags pra sharding**

- `@critical` — bloqueia produção se falhar
- `@smoke` — smoke test rápido (~30s)
- `@slow` — testes demorados (carga, timeouts)
- `@webhook` — testes com webhooks externos
- `@lgpd` — compliance
- `@billing` — pagamento SaaS

### 4. **data-testid everywhere**

Todas as interações usam `data-testid` (não CSS selectors frágeis):

```tsx
// ✅ Bom
<button data-testid="checkout-submit">Finalizar</button>

// ❌ Ruim
<button className="btn btn-primary">Finalizar</button>
// page.locator('.btn.btn-primary')  // quebra se CSS mudar
```

---

## 🎯 Cenários cobertos

### ✅ Fluxo completo (`complete-order-flow.spec.ts`)

```
[1] Admin adiciona produto → cardápio
[2] Cliente vê cardápio via QR
[3] Cliente adiciona ao carrinho
[4] Cliente finaliza checkout com PIX
[5] QR Code PIX é exibido
[6] Webhook confirma pagamento
[7] KDS recebe pedido em tempo real
[8] Cozinha: pendente → preparando → pronto
[9] Garçom: pronto → entregue
[10] Cliente vê status "Entregue"
[11] Analytics reflete o pedido
```

### ✅ Onboarding wizard (`onboarding-wizard.spec.ts`)

- Wizard 4 steps (Vertical → Dados → Template → Sucesso)
- Validação de campos obrigatórios
- Persistência em localStorage
- Toggle de verticais
- Aplicação correta de cada template (pizzaria, hamburgueria, marmita)

### ✅ Billing (`subscription.spec.ts`)

- Trial de 14 dias visível
- Preços corretos (R$ 49,90 / R$ 479)
- Checkout Asaas (mockado em test)
- **Webhook idempotente** (mesmo eventId não duplica)
- **Anti-bypass** (priceCents do body é IGNORADO)
- Cancelamento de assinatura

### ✅ Analytics (`dashboard.spec.ts`)

- Dashboard inicial zerado
- Reflete em tempo real após pedido pago
- Ranking de produtos correto
- Performance < 5s
- Filtros de período
- Gráficos renderizam

### ✅ LGPD (`compliance.spec.ts`)

- Cookie banner aparece e pode ser dismissed
- Páginas `/termos` e `/privacidade` acessíveis
- Plausible NÃO usa cookies
- Sentry mascara PII (email, CPF, cartão)
- Webhook não loga cartão completo

### ✅ Smoke (`smoke.spec.ts`)

- Landing carrega
- Cadastro/Login carregam
- Termos/Privacidade acessíveis (200)
- Health check responde
- CORS funciona
- Cardápio público lista produtos
- Admin dashboard carrega

---

## 🐛 Debugging

### Ver falha específica

```bash
pnpm test:e2e --grep "nome do teste" --headed
```

### UI Mode (recomendado)

```bash
pnpm test:e2e:ui
```

### Trace viewer

```bash
pnpm test:e2e --trace on
npx playwright show-trace test-results/trace.zip
```

### Limpar cache

```bash
pnpm test:e2e --clear-cache
```

---

## 📈 Métricas esperadas

| Métrica | Esperado |
|---|---|
| **Duração total** | 5-15 min (paralelo) |
| **Duração smoke** | < 1 min |
| **Duração critical** | < 3 min |
| **Taxa de flake** | < 2% |
| **Cobertura de fluxos críticos** | 100% |

---

## 🚨 Quando rodar

| Momento | Comando | Por quê |
|---|---|---|
| Antes de commit | `pnpm test:e2e:smoke` | Sanidade rápida |
| Antes de PR | `pnpm test:e2e:critical` | Bloqueia merge se crítico falhar |
| Pós-deploy | `pnpm test:e2e:smoke` | Smoke test em prod |
| Pré-release | `pnpm test:e2e` (full) | Garantia total |
| Debug de feature | `pnpm test:e2e:ui` | Ver step-by-step |

---

## 🔗 Próximos testes sugeridos

1. **Multi-tenant:** Trocar de restaurante e validar isolamento de dados
2. **Concorrência:** 50 pedidos simultâneos (load test)
3. **Offline-first:** Pedir sem internet, voltar online, verificar sync
4. **Cashback:** Validar acúmulo + resgate
5. **Modo garçom:** Chamar garçom via tablet
6. **i18n:** Trocar idioma EN/ES (se implementado)
7. **Acessibilidade:** axe-core + WCAG AA compliance
8. **Visual regression:** Percy/Chromatic pra detectar mudanças de UI

---

## 📚 Referências

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Page Object Model pattern](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [PediAI Openspec](.openspec/)