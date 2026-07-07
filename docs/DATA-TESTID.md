# 🎯 Padrão `data-testid` no PediAI

**Última atualização:** 06 de julho de 2026

Convenção e ferramenta para adicionar `data-testid` em componentes React de forma consistente.

---

## 🎯 Por que `data-testid`?

CSS selectors (`.btn-primary`) e XPath quebram quando o design muda.
`data-testid` é **estável**, **intencional** e **separado da apresentação**.

**❌ Ruim:**
```tsx
<button className="btn btn-primary" onClick={...}>Salvar</button>
```
```ts
await page.locator('.btn.btn-primary').click(); // quebra se CSS mudar
```

**✅ Bom:**
```tsx
<button data-testid="save-button" className="btn btn-primary" onClick={...}>Salvar</button>
```
```ts
await page.locator('[data-testid="save-button"]').click(); // estável
```

---

## 📋 Convenção de nomenclatura

Padrão: `<recurso>-<elemento>` com prefixo do app.

**Prefixo padrão:** `pedi-` (configurável)

### Por tipo de elemento

| Elemento | Padrão | Exemplo |
|---|---|---|
| **Botão** | `<acao>-button` | `pedi-save-button`, `pedi-continue-button` |
| **Input** | `<campo>-input` | `pedi-email-input`, `pedi-cnpj-input` |
| **Select** | `<campo>-select` | `pedi-plan-select` |
| **Textarea** | `<campo>-textarea` | `pedi-feedback-textarea` |
| **Form** | `<form-name>-form` | `pedi-checkout-form` |
| **Link** | `<destino>-link` | `pedi-register-link` |
| **Container/Section** | `<contexto>` | `pedi-onboarding-step-1`, `pedi-cookie-banner` |
| **Modal/Dialog** | `<nome>-modal` ou `<nome>-dialog` | `pedi-confirm-modal` |
| **Toast/Alert** | `<tipo>-toast` | `pedi-success-toast`, `pedi-error-toast` |
| **Card/Item** | `<tipo>-card` ou `<tipo>-item` | `pedi-product-card`, `pedi-top-product-item` |
| **List** | `<tipo>-list` | `pedi-products-list`, `pedi-top-products-list` |
| **Chart** | `<tipo>-chart` | `pedi-orders-by-status-chart` |
| **Table Row** | `<recurso>-row` | `pedi-order-row`, `pedi-invoice-row` |

### Casos especiais

| Caso | Padrão | Exemplo |
|---|---|---|
| Botão de fechar | `close-button` ou `dismiss-button` | `pedi-cookie-dismiss` |
| Botão de ícone (sem texto) | baseado no `aria-label` | `pedi-menu-toggle` |
| Step de wizard | `<step>-step-<n>` | `pedi-onboarding-step-1` |
| Loading spinner | `loading-spinner` | `pedi-loading` |
| Empty state | `empty-state` | `pedi-empty-orders` |
| Item selecionável | `<tipo>-item-<identificador>` | `pedi-vertical-pizzaria` |

---

## 🛠️ Script automático

Criado em `scripts/add-data-testids.js`.

### Uso

```bash
# Dry-run (mostra o que mudaria, não altera nada)
node scripts/add-data-testids.js src/ --dry-run

# Aplicar em diretório
node scripts/add-data-testids.js src/

# Arquivo específico
node scripts/add-data-testids.js src/app/onboarding/page.tsx

# Prefixo customizado
node scripts/add-data-testids.js src/ --prefix myapp
```

### O que ele faz

1. Varre arquivos `.tsx`/`.jsx` recursivamente
2. Identifica elementos `<button>`, `<input>`, `<select>`, etc.
3. Gera testid baseado em heurística (prioridade: name > texto > className > id)
4. Adiciona `data-testid="prefix-recurso-elemento"`
5. Cria backup `*.testids-backup.tsx` antes de modificar
6. **NÃO** modifica elementos que já têm testid

### Heurística de geração

```
1. <input name="email" />        → data-testid="pedi-email-input"
2. <button>Salvar</button>       → data-testid="pedi-salvar-button"
3. <div className="modal ..." />  → data-testid="pedi-modal"
4. <a id="register-link">        → data-testid="pedi-register-link"
5. <span>...</span>              → (não recebe testid — span raramente interativo)
```

---

## 🎯 Lista de testids OBRIGATÓRIOS (usados nos testes E2E)

### Fluxo completo (`complete-order-flow.spec.ts`)

```html
<!-- Menu público -->
<main data-testid="menu-cardapio">...</main>
<div data-testid="product-card">...</div>

<!-- Carrinho -->
<span data-testid="cart-badge-count">1</span>

<!-- Checkout -->
<input data-testid="checkout-name" />
<input data-testid="checkout-email" />
<input data-testid="checkout-phone" />
<input data-testid="checkout-table-number" />
<button data-testid="payment-method-pix" />
<button data-testid="payment-method-card" />
<button data-testid="checkout-submit" />
<div data-testid="order-summary">...</div>
<div data-testid="error-message">...</div>

<!-- PIX QR Code -->
<div data-testid="pix-qr-code">...</div>
<div data-testid="pix-expiration">...</div>

<!-- KDS -->
<div data-testid="kitchen-order-${orderId}">...</div>
<div data-order-id="${orderId}" data-status="preparing" />
<div data-order-id="${orderId}" data-status="ready" />

<!-- Admin -->
<button data-testid="mark-delivered" />

<!-- Order page -->
<span data-testid="order-status">...</span>
```

### Onboarding wizard (`onboarding-wizard.spec.ts`)

```html
<section data-testid="onboarding-step-1">...</section>
<section data-testid="onboarding-step-2">...</section>
<section data-testid="onboarding-step-3">...</section>
<section data-testid="onboarding-step-4">...</section>

<button data-vertical-slug="pizzaria">Pizzaria</button>
<button data-vertical-slug="hamburgueria">Hamburgueria</button>

<input data-testid="onboarding-restaurant-name" />
<input data-testid="onboarding-cnpj" />
<input data-testid="onboarding-address" />
<input data-testid="onboarding-phone" />

<button data-testid="onboarding-continue">Continuar</button>
<button data-testid="onboarding-back">Voltar</button>
<button data-testid="onboarding-apply-template">Aplicar</button>

<div data-testid="template-vertical-name">{vertical}</div>

<div data-testid="onboarding-success">...</div>
<a data-testid="onboarding-dashboard-link">Acessar painel</a>
```

### Billing (`subscription.spec.ts`)

```html
<div data-testid="current-plan-card">...</div>
<span data-testid="trial-days-remaining">14 dias</span>

<button data-testid="plan-monthly">R$ 49,90/mês</button>
<button data-testid="plan-annual">R$ 479,ano</button>

<button data-testid="checkout-button">Assinar</button>
<button data-testid="cancel-subscription">Cancelar</button>
<button data-testid="confirm-cancel">Confirmar</button>

<span data-testid="subscription-status">Em Trial</span>
<span data-testid="next-billing-date">15/07/2026</span>

<div data-testid="payment-history">...</div>
<div data-testid="invoice-row">...</div>
```

### Analytics (`dashboard.spec.ts`)

```html
<div data-testid="analytics-today-revenue">R$ 1.234,56</div>
<div data-testid="analytics-week-revenue">...</div>
<div data-testid="analytics-month-revenue">...</div>
<div data-testid="analytics-total-orders">142</div>
<div data-testid="analytics-avg-ticket">R$ 79,90</div>

<div data-testid="top-products-list">...</div>
<div data-testid="top-product-item">Pizza Calabresa</div>

<div data-testid="orders-by-status-chart">...</div>
<div data-testid="peak-hours-chart">...</div>

<button data-testid="date-range-selector">Últimos 7 dias</button>
<button data-testid="range-option-last-7-days">7 dias</button>
<div data-testid="analytics-loading">...</div>
```

### Admin products (`AdminProductsPage`)

```html
<button data-testid="new-product-button">+ Novo</button>

<input data-testid="product-name" />
<textarea data-testid="product-description" />
<input data-testid="product-price" />
<select data-testid="product-category">...</select>

<div data-testid="variations-section">...</div>
<button data-testid="add-variation">+ Variação</button>
<input data-testid="variation-name" />
<input data-testid="variation-price" />

<button data-testid="save-product">Salvar</button>
<button data-testid="confirm-delete">Confirmar</button>

<div data-testid="products-list">...</div>
<div data-testid="product-row">...</div>
<button data-testid="edit-product">...</button>
<button data-testid="delete-product">...</button>

<input data-testid="products-search" placeholder="Buscar..." />

<div data-testid="success-toast">Salvo com sucesso</div>
<div data-testid="error-toast">Erro ao salvar</div>
```

### Cookie banner LGPD

```html
<div data-testid="cookie-banner">
  <button data-testid="cookie-banner-dismiss">Entendi</button>
</div>
```

### Production smoke

```html
<meta name="description" content="..." />
<meta property="og:title" content="..." />
<link rel="canonical" href="..." />
```

---

## 🧪 Validação

Após adicionar testids, valide com:

```bash
# Acha todos os data-testid no código
grep -r "data-testid" apps/web/src/ | wc -l

# Acha elementos interativos SEM testid (possíveis gaps)
grep -r "<button" apps/web/src/ --include="*.tsx" -l | xargs grep -L "data-testid"
```

---

## 📚 Recursos

- [Playwright Locators](https://playwright.dev/docs/locators#locating-elements)
- [Testing Library — Queries](https://testing-library.com/docs/queries/about)
- [Cypress — Best Practices](https://docs.cypress.io/guides/references/best-practices#Selecting-Elements)