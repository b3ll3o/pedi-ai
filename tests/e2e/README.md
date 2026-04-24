# Testes E2E — Pedi-AI

Cobertura de testes end-to-end usando [Playwright](https://playwright.dev/).

## Visão Geral

| Persona | Arquivos de Teste | Fluxos |
|---------|------------------|--------|
| Cliente | 9 specs | auth, menu, cart, checkout, order, payment, offline, combos, modifier-groups |
| Administrador | 6 specs | auth, categories, products, orders, table-qr, combos-admin |
| Realtime | 2 specs | realtime-updates, kitchen |

**Total: 17 spec files cobrindo 17 fluxos**

---

## Matriz de Cobertura

### Cliente

| Fluxo | Spec File | Tags | Status |
|-------|-----------|------|--------|
| auth | `tests/customer/auth.spec.ts` | @smoke, @critical | ✅ |
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

### Realtime

| Fluxo | Spec File | Tags | Status |
|-------|-----------|------|--------|
| realtime-updates | `tests/admin/realtime-updates.spec.ts` | — | ✅ |
| kitchen | `tests/waiter/kitchen.spec.ts` | @slow | ✅ |

---

## Tags

| Tag | Descrição | Testes |
|-----|-----------|--------|
| `@smoke` | Testes essenciais de sanidade | auth, checkout, admin auth |
| `@critical` | Fluxos críticos para negócio | auth, checkout, admin auth |
| `@slow` | Testes que levam >30s | checkout, order, payment, kitchen |

### Comandos por Tag

```bash
pnpm test:e2e:smoke    # Apenas @smoke
pnpm test:e2e:slow     # Apenas @slow
pnpm test:e2e:fast     # Exclui @slow
```

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
# Instalar dependências
pnpm install

# Instalar navegadores
pnpm install:browsers

# Iniciar o servidor de desenvolvimento
pnpm dev
```

### Comandos

```bash
# Executar todos os testes (requer servidor rodando em localhost:3000)
pnpm test:e2e

# Executar com interface visual (debug)
pnpm test:e2e:ui

# Executar em modo headed (ver navegador)
pnpm test:e2e:headed

# Executar em um navegador específico
pnpm test:e2e:chromium
pnpm test:e2e:firefox
pnpm test:e2e:webkit

# Executar com apenas 1 worker (para depuração)
pnpm test:e2e:worker

# Executar testes que casam com uma palavra-chave
pnpm test:e2e:grep "checkout"
```

### Variáveis de Ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `BASE_URL` | `http://localhost:3000` | URL base da aplicação |
| `CI` | `undefined` | Quando definido, ativa retry e webServer automático |

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

## Fluxos Sem Cobertura

| Fluxo | Prioridade | Observação |
|-------|-----------|------------|
| Filtros no cardápio | Baixa | Busca e filtros por categoria |

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
│   ├── customer/           # Testes do cardápio digital
│   ├── waiter/             # Testes do painel do garçom
│   └── shared/
│       ├── fixtures/       # Dados de teste e setup
│       └── helpers/        # Funções utilitárias
├── playwright.config.ts    # Configuração do Playwright
└── package.json
```

---

## Manutenção

Conforme as regras do projeto:
- **Testes DEVEM ser atualizados imediatamente** ao adicionar, modificar ou corrigir qualquer funcionalidade
- **Antes de merge de PR**: todos os testes E2E DEVEM passar localmente
- **CI/CD**: o pipeline E2E bloqueia merge se os testes falharem
