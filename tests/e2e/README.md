# Testes E2E — Pedi-AI

Cobertura de testes end-to-end usando [Playwright](https://playwright.dev/).

## Visão Geral

| Persona | Arquivos de Teste | Page Objects |
|---------|------------------|--------------|
| Cliente | 7 specs | CustomerLoginPage, MenuPage, CartPage, CheckoutPage, OrderPage |
| Administrador | 5 specs | AdminLoginPage, AdminDashboardPage, AdminCategoriesPage, AdminProductsPage, AdminOrdersPage, TableQRPage |
| Garçom | 1 spec | WaiterDashboardPage |

**Total: 13 arquivos de spec cobrindo 13 fluxos**

---

## Fluxos por Persona

### Cliente

| Arquivo | Fluxo Coberto | Status |
|---------|--------------|--------|
| `tests/customer/menu.spec.ts` | Navegação e busca no cardápio | ✅ |
| `tests/customer/cart.spec.ts` | Adicionar, remover e editar itens no carrinho | ✅ |
| `tests/customer/checkout.spec.ts` | Revisão do pedido e confirmação | ✅ |
| `tests/customer/order.spec.ts` | Acompanhamento do pedido (status) | ✅ |
| `tests/customer/payment.spec.ts` | Processamento de pagamento | ✅ |
| `tests/customer/offline.spec.ts` | Funcionalidade offline e sincronização | ✅ |
| `tests/customer/auth.spec.ts` | Login, autenticação e recuperação de senha do cliente | ✅ |

### Administrador

| Arquivo | Fluxo Coberto | Status |
|---------|--------------|--------|
| `tests/admin/auth.spec.ts` | Login, logout e recuperação de senha do administrador | ✅ |
| `tests/admin/categories.spec.ts` | CRUD de categorias do cardápio | ✅ |
| `tests/admin/products.spec.ts` | CRUD de produtos | ✅ |
| `tests/admin/orders.spec.ts` | Gestão e acompanhamento de pedidos | ✅ |
| `tests/admin/table-qr.spec.ts` | Cadastro de mesas e geração de QR codes | ✅ |

### Garçom

| Arquivo | Fluxo Coberto | Status |
|---------|--------------|--------|
| `tests/waiter/kitchen.spec.ts` | Exibição de pedidos na cozinha | ✅ |

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
