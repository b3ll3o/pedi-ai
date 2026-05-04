# Playwright E2E - Best Practices

## Visão Geral

Este documento estabelece padrões e melhores práticas para testes E2E usando Playwright no projeto Pedi-AI.

---

## 1. Performance

### 1.1 Navegação

```typescript
// ❌ LENTO - Espera 'networkidle' que aguarda fonts, analytics, etc.
await page.goto('/menu')
await page.waitForLoadState('networkidle')

// ✅ RÁPIDO - Usa 'load' que é 2-5x mais rápido
await page.goto('/menu', { waitUntil: 'load' })

// ✅ MAIS RÁPIDO - Usa 'domcontentloaded' quando possível
await page.goto('/menu', { waitUntil: 'domcontentloaded' })
```

### 1.2 Wait Strategies

```typescript
// ❌ LENTO - hardcoded timeout
await page.waitForTimeout(5000)

// ❌ LENTO - networkidle desnecessário
await page.waitForLoadState('networkidle')

// ✅ RÁPIDO - Espera condicional explícita
await page.waitForURL(/\/menu/, { timeout: 15000 })

// ✅ RÁPIDO - Espera por elemento visível
await page.waitForSelector('[data-testid="my-button"]', { state: 'visible', timeout: 10000 })
```

### 1.3 Fixtures e Cache

```typescript
// ✅ Use storage state cache (TTL: 10 minutos)
await performLogin(page, email, password, '/login', /\/menu/)

// ✅ Cache em memória para seed data
const seedDataCache = new Map<number, SeedData>()
if (seedDataCache.has(workerIndex)) {
  return seedDataCache.get(workerIndex)!
}
```

### 1.4 Parallel Execution

```typescript
// playwright.config.ts
fullyParallel: true,  // Paraleliza testes localmente
workers: isCI ? 1 : Math.max(1, Math.floor(os.cpus().length / 2))
```

### 1.5 Sharding em CI

```bash
# 4 shards em paralelo
SHARD=1/4 pnpm test:e2e:all
SHARD=2/4 pnpm test:e2e:all
SHARD=3/4 pnpm test:e2e:all
SHARD=4/4 pnpm test:e2e:all
```

---

## 2. Data Management

### 2.1 Seed Data

Seed é executado uma vez por worker e cacheado em `.seed-result.json`:

```bash
# Executar seed manualmente
pnpm test:e2e:seed

# Seed é executado automaticamente se .seed-result.json não existir
```

### 2.2 Factories para Dados Específicos

Para testes que requerem dados específicos (ex: pedido com status "preparing"), use factories:

```typescript
import { createOrder } from '../shared/factories'

test('should update preparing order', async ({ api, seedData }) => {
  // Criar pedido via API (mais rápido que UI)
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

  // Testar UI com dados específicos
  const ordersPage = new AdminOrdersPage(admin)
  await ordersPage.goto()
  // ...
})
```

### 2.3 Cleanup Automático

```typescript
// Sempre que possível, use IDs únicos para evitar conflitos
const idempotencyKey = generateUUID()

// Para orders de teste, use prefixo 'E2E-TEST-' ou similar
```

---

## 3. Page Objects

### 3.1 Estrutura

```typescript
// pages/MenuPage.ts
export class MenuPage {
  readonly page: Page

  // Locators como propriedades (nunca em métodos)
  readonly categoryTabs = this.page.locator('[data-testid^="menu-category-card-"]')
  readonly productCards = this.page.locator('[data-testid^="menu-product-card-"]')

  constructor(page: Page) {
    this.page = page
  }

  // Navegação com wait otimizado
  async goto(categoryId?: string): Promise<void> {
    const url = categoryId ? `/menu/${categoryId}` : '/menu'
    await this.page.goto(url, { waitUntil: 'load' })
  }

  // Ações de alto nível
  async addProductToCart(productName: string): Promise<void> {
    const productCard = this.productCards.filter({ hasText: productName })
    await productCard.locator('[data-testid^="menu-add-to-cart-"]').click()
  }
}
```

### 3.2 Locators

```typescript
// ✅ MELHOR: data-testid com prefixo para dinamismo
'[data-testid^="menu-product-card-"]'

// ✅ BOM: data-testid exato
'[data-testid="checkout-name"]'

// ⚠️ ACEITÁVEL: Role semântico
page.getByRole('button', { name: 'Enviar' })

// ❌ EVITAR: CSS selectors frágeis
'.checkout-form > div.name-input'
page.locator('button').nth(3)

// ❌ NUNCA: XPath
'//div[@id="checkout"]/form/input'
```

### 3.3 Métodos de Alto Nível

```typescript
// pages/CheckoutPage.ts
export class CheckoutPage {
  async fillCustomerInfo(info: {
    name?: string
    email?: string
    phone?: string
    tableCode?: string
  }): Promise<void> {
    if (info.name) await this.nameInput.fill(info.name)
    if (info.email) await this.emailInput.fill(info.email)
    if (info.phone) await this.phoneInput.fill(info.phone)
    if (info.tableCode) await this.tableCodeInput.fill(info.tableCode)
  }

  async submitAndWaitForOrder(): Promise<string> {
    const [response] = await Promise.all([
      this.page.waitForResponse('**/api/orders'),
      this.submitButton.click()
    ])
    return response.url()
  }
}
```

---

## 4. Test Structure

### 4.1 Arrange-Act-Assert

```typescript
test('should complete checkout', async ({ authenticated, seedData }) => {
  // Arrange
  const menuPage = new MenuPage(authenticated)
  const checkoutPage = new CheckoutPage(authenticated)
  await menuPage.goto()
  await menuPage.addProductToCart('Coca-Cola')

  // Act
  await checkoutPage.goto()
  await checkoutPage.fillCustomerInfo({
    name: 'João Silva',
    email: 'joao@example.com',
    tableCode: seedData.table.code
  })
  await checkoutPage.selectPaymentMethod('pix')
  await checkoutPage.submitOrder()

  // Assert
  await expect(authenticated).toHaveURL(/\/order\//)
})
```

### 4.2 Tags para Classificação

```typescript
// @smoke - Testes essenciais (< 1 min)
// @critical - Fluxos críticos que bloqueiam merge
// @slow - Testes > 30s
// @realtime - Testes que dependem de Supabase realtime

test('deve fazer login', { tag: ['@smoke', '@critical'] }, async ({ page, seedData }) => {
  // ...
})
```

### 4.3 Test Isolation

```typescript
// Cada teste deve ser independente
// Não dependa de estado de outros testes

// ❌ RUIM - Depende de order criado no teste anterior
test('atualiza status do pedido', async () => {
  const orderId = globalState.lastOrderId
})

// ✅ BOM - Cria seus próprios dados
test('atualiza status do pedido', async ({ api, seedData }) => {
  const order = await createOrder(api, { ... })
})
```

---

## 5. Common Mistakes

### 5.1 Waits

```typescript
// ❌ WAIT EXPLÍCITO SEMPRE
await page.waitForTimeout(5000)

// ✅ USE WAIT IMPLÍCITO
await page.click('button')  // Playwright espera até estar clicável

// ✅ OU WAIT EXPLÍCITO QUANDO NECESSÁRIO
await page.waitForURL(/\/order\//, { timeout: 30000 })
```

### 5.2 Selectors

```typescript
// ❌ SELECTOR FRÁGIL
await page.locator('.modal-content > div:nth-child(2) > button')

// ✅ SELECTOR ESTÁVEL
await page.locator('[data-testid="confirm-button"]')

// ✅ SELECTOR SEMÂNTICO
await page.getByRole('button', { name: 'Confirmar' })
```

### 5.3 Estado Compartilhado

```typescript
// ❌ RUIM - Variável global
let currentUser: User

test('cria usuário', async () => {
  currentUser = await createUser()
})

test('usa usuário', async () => {
  // pode ver estado do teste anterior
})

// ✅ BOM - Estado isolado
test('cria e usa usuário', async () => {
  const user = await createUser()
  // use user local
})
```

### 5.4 Storage State

```typescript
// ❌ LENTO - Limpa cookies sempre
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
})

// ✅ RÁPIDO - Usa storage state com cache
test.describe({ scope: 'session' }, () => {
  test.beforeAll(async ({ page }) => {
    await performLogin(page, email, password) // Cache TTL: 10min
  })
})
```

---

## 6. Debugging

### 6.1 Screenshots on Failure

```typescript
// playwright.config.ts
use: {
  screenshot: 'only-on-failure',  // Captura só em falha
}
```

### 6.2 Trace on Failure

```typescript
// playwright.config.ts
use: {
  trace: 'on-first-retry',  // Captura trace na primeira falha
}
```

### 6.3 UI Mode

```bash
# Executar com interface visual para debug
pnpm test:e2e:ui

# Depois clique em "Pick" para selecionar elementos
```

### 6.4 Debug Mode

```bash
# Pausa automática em erros
pnpm test:e2e:debug
```

---

## 7. CI/CD

### 7.1 Environment Variables

```bash
# .env.e2e
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
BASE_URL=http://localhost:3000
CI=true
```

### 7.2 Scripts

```bash
# Teste rápido local (chromium only, sem slow)
pnpm test:e2e:fast

# Teste completo (todos browsers)
pnpm test:e2e:all

# Smoke tests
pnpm test:e2e:smoke

# Critical tests
pnpm test:e2e:critical

# Shards manuais
SHARD=1/4 pnpm test:e2e:all
```

### 7.3 Pipeline

```yaml
# .github/workflows/e2e.yml
jobs:
  seed:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:e2e:seed

  e2e:
    needs: seed
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - run: SHARD=${{ matrix.shard }}/4 pnpm test:e2e:all
```

---

## 8. Quick Reference

| Situação | Solução |
|----------|---------|
| Navegação lenta | Use `waitUntil: 'load'` em vez de `networkidle` |
| Teste flake | Adicione retry: `test('...', { retry: 2 })` |
| Dados específicos | Use factories: `createOrder(api, {...})` |
| Espera por API | `page.waitForResponse('**/api/orders')` |
| Espera por URL | `page.waitForURL(/\/order\//)` |
| Espera por elemento | `page.waitForSelector('[data-testid="x"]')` |
| Debug visual | `pnpm test:e2e:ui` |
| Seletor lento | Use `data-testid` em vez de CSS |
| Setup repetitivo | Use `test.beforeAll` com storage state cache |
