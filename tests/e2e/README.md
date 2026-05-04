# Testes E2E — Pedi-AI

Cobertura de testes end-to-end usando [Playwright](https://playwright.dev/).

## Visão Geral

| Persona | Arquivos de Teste | Fluxos |
|---------|------------------|--------|
| Cliente | 11 specs | auth, register, menu, cart, checkout, order, payment, offline, combos, modifier-groups |
| Administrador | 9 specs | auth, categories, products, orders, table-qr, combos-admin, realtime-updates, analytics |
| Garçom | 1 spec | kitchen |
| Landing | 1 spec | landing |
| Offline | 1 spec | cross-tab-sync |

**Total: 30 spec files cobrindo fluxos completos**

---

## Matriz de Cobertura

### Cliente

| Fluxo | Spec File | Tags | Status |
|-------|-----------|------|--------|
| auth | `tests/customer/auth.spec.ts` | @smoke, @critical | ✅ |
| register | `tests/customer/register.spec.ts` | @smoke | ✅ |
| menu | `tests/customer/menu.spec.ts` | — | ✅ |
| cart | `tests/customer/cart.spec.ts` | — | ✅ |
| checkout | `tests/customer/checkout.spec.ts` | @smoke, @slow | ✅ |
| order | `tests/customer/order.spec.ts` | @slow | ✅ |
| payment | `tests/customer/payment.spec.ts` | @slow | ✅ |
| offline | `tests/customer/offline.spec.ts` | — | ✅ |
| combos | `tests/customer/combos.spec.ts` | — | ✅ |
| modifier-groups | `tests/customer/modifier-groups.spec.ts` | — | ✅ |

### Administrador

| Fluxo | Spec File | Tags | Status |
|-------|-----------|------|--------|
| auth | `tests/admin/auth.spec.ts` | @smoke, @critical | ✅ |
| categories | `tests/admin/categories.spec.ts` | — | ✅ |
| products | `tests/admin/products.spec.ts` | — | ✅ |
| orders | `tests/admin/orders.spec.ts` | — | ✅ |
| table-qr | `tests/admin/table-qr.spec.ts` | — | ✅ |
| combos-admin | `tests/admin/combos-admin.spec.ts` | — | ✅ |
| realtime-updates | `tests/admin/realtime-updates.spec.ts` | — | ✅ |
| analytics | `tests/admin/analytics.spec.ts` | — | ✅ |

### Realtime

| Fluxo | Spec File | Tags | Status |
|-------|-----------|------|--------|
| realtime-updates | `tests/admin/realtime-updates.spec.ts` | — | ✅ |
| kitchen | `tests/waiter/kitchen.spec.ts` | @slow | ✅ |

### Landing Page

| Fluxo | Spec File | Tags | Status |
|-------|-----------|------|--------|
| landing | `tests/landing/landing.spec.ts` | @smoke | ✅ |

---

## Tags

| Tag | Descrição | Testes |
|-----|-----------|--------|
| `@smoke` | Testes essenciais de sanidade | auth, register, checkout, admin auth, landing |
| `@critical` | Fluxos críticos para negócio | auth, checkout, admin auth |
| `@slow` | Testes que levam >30s | checkout, order, payment, kitchen |

---

## Page Objects

Localização: `tests/e2e/pages/`

| Page Object | Descrição |
|-------------|-----------|
| `CustomerLoginPage` | Tela de login do cliente |
| `CartPage` | Carrinho de compras |
| `CheckoutPage` | Página de finalização |
| `OrderPage` | Acompanhamento do pedido |
| `AdminLoginPage` | Tela de login administrativo |
| `AdminDashboardPage` | Painel administrativo |
| `AdminCategoriesPage` | Gerenciamento de categorias |
| `AdminProductsPage` | Gerenciamento de produtos |
| `AdminOrdersPage` | Lista e detalhes de pedidos |
| `TableQRPage` | Mesas e QR codes |
| `WaiterDashboardPage` | Exibição dos pedidos em produção |

---

## Como Executar

### Pré-requisitos

```bash
# 1. Configurar .env.e2e com Supabase Cloud
cp .env.local.example .env.e2e
# Edite .env.e2e com suas credenciais Supabase Cloud

# 2. Instalar dependências
pnpm install

# 3. Instalar navegadores
pnpm install:browsers

# 4. Popular dados de teste no Supabase Cloud
pnpm test:e2e:seed

# 5. Iniciar o servidor de desenvolvimento
pnpm dev
```

### Comandos

```bash
# Executar todos os testes (requer servidor rodando em localhost:3000)
pnpm test:e2e

# Executar com interface visual (debug)
pnpm test:e2e:ui

# Executar em todos os browsers
pnpm test:e2e:all

# Executar com apenas 1 worker (para depuração)
pnpm test:e2e:worker

# Executar testes que casam com uma palavra-chave
pnpm test:e2e:grep "checkout"

# Smoke tests (rápido)
pnpm test:e2e:smoke

# Critical tests (mais rápido)
pnpm test:e2e:critical

# Fast tests (exclui slow)
pnpm test:e2e:fast
```

### Variáveis de Ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `BASE_URL` | `http://localhost:3000` | URL base da aplicação |
| `CI` | `undefined` | Quando definido, ativa retry e webServer automático |
| `E2E_SKIP_NEW_TESTS` | `undefined` | Quando `true`, executa apenas auth.spec (rollback) |
| `SHARD` | `undefined` | Shard atual (ex: `1/4`) |

> **Nota**: E2E usa `.env.e2e` (Supabase Cloud). Para development local, use `.env.local`.

### Relatórios

Os relatórios HTML e JSON são gerados em:
- `playwright-report/` — relatório HTML navegável
- `playwright-results.json` — resultados em JSON
- `test-results/` — screenshots e traces de falhas

---

## Browsers Suportados

| Browser | Dispositivo | Configuração |
|---------|-------------|--------------|
| Chromium | Desktop | `chromium` |
| Firefox | Desktop | `firefox` |
| Webkit | Desktop | `webkit` |
| Chrome | Mobile (Pixel 5) | `Mobile Chrome` |
| Safari | Mobile (iPhone 12) | `Mobile Safari` |

---

## Arquitetura

```
tests/e2e/
├── pages/                  # Page Objects (POM)
│   ├── Admin*.ts
│   ├── CartPage.ts
│   ├── CheckoutPage.ts
│   ├── CustomerLoginPage.ts
│   ├── MenuPage.ts
│   ├── OrderPage.ts
│   ├── TableQRPage.ts
│   └── WaiterDashboardPage.ts
├── tests/
│   ├── admin/              # Testes do painel administrativo
│   ├── auth/               # Testes de autenticação
│   ├── customer/           # Testes do cardápio digital
│   ├── landing/            # Testes da landing page
│   ├── offline/            # Testes offline
│   ├── payment/            # Testes de pagamento
│   ├── waiter/             # Testes do painel do garçom
│   └── shared/
│       ├── factories.ts     # Data factories para criar dados de teste
│       ├── fixtures/       # Dados de teste e setup
│       └── helpers/        # Funções utilitárias
├── scripts/
│   ├── seed.ts             # Script de seed de dados
│   └── cleanup.ts           # Script de cleanup
├── playwright.config.ts    # Configuração do Playwright
├── BEST_PRACTICES.md       # Melhores práticas
├── FLUXOS.md               # Documentação de fluxos
└── package.json
```

---

## Performance

### Otimizações Implementadas

1. **Navegação**: Usa `waitUntil: 'load'` em vez de `networkidle'` (2-5x mais rápido)
2. **Storage State**: Cache TTL de 10 minutos para sessões autenticadas
3. **Seed Data**: Cache em memória por worker index
4. **Parallel Execution**: `fullyParallel: true` para testes locais
5. **Sharding**: 4 shards em CI para distribuição de carga
6. **Network Blocking**: Bloqueia requests desnecessários (fonts, analytics)

### Factories para Dados Específicos

Para testes que requerem dados específicos, use factories:

```typescript
import { createOrder } from '../shared/factories'

test('should update preparing order', async ({ api, seedData }) => {
  const order = await createOrder(api, {
    restaurantId: seedData.restaurant.id,
    tableId: seedData.table.id,
    status: 'preparing',
    paymentStatus: 'paid',
    items: [{
      productId: seedData.products[0].id,
      quantity: 1,
      unitPrice: seedData.products[0].price
    }]
  })
})
```

---

## Manutenção

Conforme as regras do projeto:
- **Testes DEVEM ser atualizados imediatamente** ao adicionar, modificar ou corrigir qualquer funcionalidade
- **Antes de merge de PR**: todos os testes E2E DEVEM passar localmente
- **CI/CD**: o pipeline E2E bloqueia merge se os testes falharem

---

## Links Úteis

- [Playwright Docs](https://playwright.dev/docs)
- [Best Practices](BEST_PRACTICES.md)
- [Fluxos Documentados](FLUXOS.md)
