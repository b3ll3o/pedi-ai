# Tasks: Melhoria de Testes E2E — Cobertura e Confiabilidade

## Phase 1: Quick Wins (1-2 dias)

### 1.1 — Criar helper de criação de pedido real
- [x] 1.1.1 Criar arquivo `tests/e2e/tests/shared/helpers/orderUtils.ts` com função `createTestOrder()`

**Verification**:
- **Run**: `ls tests/e2e/tests/shared/helpers/orderUtils.ts && head -20 tests/e2e/tests/shared/helpers/orderUtils.ts`
- **Expected**: Arquivo existe e contém `createTestOrder` exportada
- [x] 1.1.2 Implementar interface `OrderCreationResult` com id, status, total, items

**Verification**:
- **Run**: `grep -A5 "interface OrderCreationResult" tests/e2e/tests/shared/helpers/orderUtils.ts`
- **Expected**: Interface com campos `id`, `status`, `total`, `items`
- [x] 1.1.3 Exportar `createOrder` helper em `tests/e2e/tests/shared/fixtures/index.ts`

**Verification**:
- **Run**: `grep "orderUtils\|createTestOrder" tests/e2e/tests/shared/fixtures/index.ts`
- **Expected**: Helper exportado no index.ts

### 1.2 — Criar fixture de pedido real
- [x] 1.2.1 Criar arquivo `tests/e2e/tests/shared/fixtures/realOrder.fixture.ts`

**Verification**:
- **Run**: `ls tests/e2e/tests/shared/fixtures/realOrder.fixture.ts`
- **Expected**: Arquivo existe
- [x] 1.2.2 Implementar fixture que cria order real via API e provê ID para tests

**Verification**:
- **Run**: `grep -E "api/orders|POST" tests/e2e/tests/shared/fixtures/realOrder.fixture.ts`
- **Expected**: Fixture faz chamada POST para criar order real
- [x] 1.2.3 Garantir que fixture usa UUID único por sessão de teste

**Verification**:
- **Run**: `grep "UUID\|uuid\|v4" tests/e2e/tests/shared/fixtures/realOrder.fixture.ts`
- **Expected**: Fixture usa UUID para identificar sessão

### 1.3 — Substituir IDs mockados em order.spec.ts
- [x] 1.3.1 Remover hardcoded `test-order-123` de `tests/e2e/tests/customer/order.spec.ts`

**Verification**:
- **Run**: `grep "test-order-123" tests/e2e/tests/customer/order.spec.ts`
- **Expected**: Nenhum resultado (mock ID removido)
- [x] 1.3.2 Substituir por chamada a `createTestOrder()` via API

**Verification**:
- **Run**: `grep "createTestOrder" tests/e2e/tests/customer/order.spec.ts`
- **Expected**: `createTestOrder()` aparece em beforeAll ou beforeEach
- [x] 1.3.3 Atualizar assertions para usar ID real retornado pela API

**Verification**:
- **Run**: `grep "order\.id\|orderId" tests/e2e/tests/customer/order.spec.ts | head -5`
- **Expected**: Assertions usam ID dinâmico ao invés de hardcoded
- [x] 1.3.4 Validar que order tracking page carrega com UUID real

**Verification**:
- **Run**: `grep "page\.goto.*order" tests/e2e/tests/customer/order.spec.ts`
- **Expected**: URL contém UUID dinâmico

### 1.4 — Substituir mock PIX em payment.spec.ts
- [x] 1.4.1 Remover dados mockados de `tests/e2e/tests/customer/payment.spec.ts`

**Verification**:
- **Run**: `grep -E "mock|fixture.*pix|pix.*mock" tests/e2e/tests/customer/payment.spec.ts -i`
- **Expected**: Nenhum mock de PIX encontrado
- [x] 1.4.2 Criar PIX order real via API antes do teste de pagamento

**Verification**:
- **Run**: `grep "payment_method.*pix\|pix.*payment" tests/e2e/tests/customer/payment.spec.ts -i`
- **Expected**: Teste cria order com método PIX
- [x] 1.4.3 Validar confirmação de pagamento PIX via webhook ou status update

**Verification**:
- **Run**: `grep "webhook\|page\.evaluate\|trigger.*pix" tests/e2e/tests/customer/payment.spec.ts`
- **Expected**: Mock webhook via `page.evaluate()` implementado para simular confirmação PIX
- [x] 1.4.4 Implementar timeout aceitável (120s) para webhook PIX

**Verification**:
- **Run**: `grep -E "timeout.*120|120.*timeout|waitFor.*120" tests/e2e/tests/customer/payment.spec.ts`
- **Expected**: Timeout de 120s configurado para webhook

### 1.5 — Completar Page Objects de Admin
- [x] 1.5.1 Verificar que locator `categoryDescriptionInput` em `AdminCategoriesPage.ts` funciona corretamente

**Verification**:
- **Run**: `npx playwright test --grep "categoryDescriptionInput" --dry-run`
- **Expected**: Locator `categoryDescriptionInput` referenciado em pelo menos 1 teste ou page object method
- [x] 1.5.2 Adicionar locator `productDescriptionInput` em `AdminProductsPage.ts`

**Verification**:
- **Run**: `grep "productDescriptionInput" tests/e2e/pages/AdminProductsPage.ts`
- **Expected**: Locator definido e inicializado com seletor correto
- [x] 1.5.3 Adicionar locator `productCategorySelect` em `AdminProductsPage.ts`

**Verification**:
- **Run**: `grep "productCategorySelect" tests/e2e/pages/AdminProductsPage.ts`
- **Expected**: Locator definido e inicializado com seletor correto

### 1.6 — Implementar métodos com assertions em AdminOrdersPage
- [x] 1.6.1 Implementar `filterByStatus()` que retorna `Promise<number>` com contagem

**Verification**:
- **Run**: `grep -A10 "filterByStatus" tests/e2e/pages/AdminOrdersPage.ts | grep "Promise<number>"`
- **Expected**: Método retorna `Promise<number>` com contagem de resultados
- [x] 1.6.2 Implementar `searchByCustomerEmail()` que retorna `Promise<number>` com contagem

**Verification**:
- **Run**: `grep -A10 "searchByCustomerEmail" tests/e2e/pages/AdminOrdersPage.ts | grep "Promise<number>"`
- **Expected**: Método retorna `Promise<number>` com contagem de resultados
- [x] 1.6.3 Implementar `getError()` que retorna `Promise<string>` com mensagem de erro

**Verification**:
- **Run**: `grep -A5 "getError.*Promise<string>" tests/e2e/pages/AdminOrdersPage.ts`
- **Expected**: Método retorna `Promise<string>` com mensagem de erro
- [x] 1.6.4 Adicionar `waitForResponse()` após cada operação para garantir que API respondeu

**Verification**:
- **Run**: `grep "waitForResponse" tests/e2e/pages/AdminOrdersPage.ts | wc -l`
- **Expected**: Múltiplos `waitForResponse()` encontrados após operações de filtro/busca

## Phase 2: Fluxos Completos (3-4 dias)

### 2.1 — Expandir seed.ts com modifier groups
- [x] 2.1.1 Adicionar produtos de teste com modifier groups obrigatórios no seed

**Verification**:
- **Run**: `grep -E "modifier.*group|required.*true" tests/e2e/scripts/seed.ts | head -5`
- **Expected**: Produtos com modifier groups onde `required=true`
- [x] 2.1.2 Adicionar produtos de teste com modifier groups opcionais no seed

**Verification**:
- **Run**: `grep -E "modifier.*group|required.*false" tests/e2e/scripts/seed.ts | head -5`
- **Expected**: Produtos com modifier groups onde `required=false`
- [x] 2.1.3 Criar produto "Combo BBQ" ou similar com modifier group "Tamaño" (required=true)

**Verification**:
- **Run**: `grep -i "combo\\|bbq\\|Tamaño" tests/e2e/scripts/seed.ts`
- **Expected**: Produto "Combo BBQ" ou similar com modifier group "Tamaño"
- [x] 2.1.4 Validar schema de modifier groups no seed está correto

**Verification**:
- **Run**: `npx tsc --noEmit tests/e2e/scripts/seed.ts 2>&1 | head -20`
- **Expected**: Seed compila sem erros de tipo

### 2.2 — Expandir seed.ts com combos
- [x] 2.2.1 Adicionar produto tipo combo com `bundle_price` menor que soma dos itens

**Verification**:
- **Run**: `grep -E "bundle_price|type.*combo" tests/e2e/scripts/seed.ts | head -5`
- **Expected**: Produto combo com `bundle_price` definido
- [x] 2.2.2 Configurar combo com 2-3 itens de outros produtos existentes

**Verification**:
- **Run**: `grep -E "combo_items|items.*combo" tests/e2e/scripts/seed.ts`
- **Expected**: Combo configurado com 2-3 itens
- [x] 2.2.3 Garantir que combo aparece em categoria correta no seed

**Verification**:
- **Run**: `grep -B5 -A5 "bundle_price" tests/e2e/scripts/seed.ts`
- **Expected**: Combo tem category_id válido

### 2.3 — Criar modifier-groups.spec.ts
- [x] 2.3.1 Criar teste: adicionar item com modifier obrigatório sem seleção → validation error

**Verification**:
- **Run**: `ls tests/e2e/tests/customer/modifier-groups.spec.ts && grep -A5 "required.*without" tests/e2e/tests/customer/modifier-groups.spec.ts`
- **Expected**: Teste existente com validação de modifier obrigatório
- [x] 2.3.2 Criar teste: adicionar item com modifier obrigatório com seleção válida

**Verification**:
- **Run**: `grep -A5 "required.*with.*selection" tests/e2e/tests/customer/modifier-groups.spec.ts`
- **Expected**: Teste com seleção válida de modifier
- [x] 2.3.3 Criar teste: adicionar item com modifier opcional sem seleção → sucesso

**Verification**:
- **Run**: `grep -A5 "optional.*without" tests/e2e/tests/customer/modifier-groups.spec.ts`
- **Expected**: Teste passa sem seleção de modifier opcional
- [x] 2.3.4 Criar teste: adicionar item com modifier opcional com seleção → preço ajustado

**Verification**:
- **Run**: `grep -E "optional.*price|price.*adjust" tests/e2e/tests/customer/modifier-groups.spec.ts -i`
- **Expected**: Teste valida ajuste de preço com modifier opcional
- [x] 2.3.5 Criar teste: validar que cart exibe modifiers selecionados corretamente

**Verification**:
- **Run**: `grep -E "cart.*modifier|modifier.*cart" tests/e2e/tests/customer/modifier-groups.spec.ts -i`
- **Expected**: Teste valida display de modifiers no cart

### 2.4 — Criar combos.spec.ts (cliente)
- [x] 2.4.1 Criar teste: cliente adiciona combo ao carrinho da menu page

**Verification**:
- **Run**: `ls tests/e2e/tests/customer/combos.spec.ts && grep "add.*combo\|combo.*cart" tests/e2e/tests/customer/combos.spec.ts -i`
- **Expected**: Arquivo existe e teste adiciona combo ao cart
- [x] 2.4.2 Criar teste: validar que bundle price é exibido no menu (não soma)

**Verification**:
- **Run**: `grep -E "bundle.*price|not.*sum|price.*display" tests/e2e/tests/customer/combos.spec.ts -i`
- **Expected**: Teste valida que bundle price é exibido
- [x] 2.4.3 Criar teste: validar que cart total usa bundle price, não soma dos itens

**Verification**:
- **Run**: `grep -E "cart.*total|bundle.*total" tests/e2e/tests/customer/combos.spec.ts`
- **Expected**: Teste valida que cart total usa bundle price
- [x] 2.4.4 Criar teste: validar que order details mostra combo com preço bundle

**Verification**:
- **Run**: `grep -E "order.*detail.*combo|combo.*order.*detail" tests/e2e/tests/customer/combos.spec.ts -i`
- **Expected**: Teste valida combo com bundle price em order details

### 2.5 — Criar combos-admin.spec.ts (admin)
- [x] 2.5.1 Criar teste: admin cria combo via API em beforeAll

**Verification**:
- **Run**: `ls tests/e2e/tests/admin/combos-admin.spec.ts && grep "beforeAll.*api.*combo\|POST.*combo" tests/e2e/tests/admin/combos-admin.spec.ts -i`
- **Expected**: Arquivo existe e cria combo via API em beforeAll
- [x] 2.5.2 Criar teste: admin visualiza combo criado na lista de produtos

**Verification**:
- **Run**: `grep -E "list.*combo|view.*combo|combo.*list" tests/e2e/tests/admin/combos-admin.spec.ts -i`
- **Expected**: Teste valida visualização do combo na lista
- [x] 2.5.3 Criar teste: admin edita bundle price de combo existente

**Verification**:
- **Run**: `grep -E "edit.*combo|bundle.*price.*edit" tests/e2e/tests/admin/combos-admin.spec.ts -i`
- **Expected**: Teste edita bundle price do combo

### 2.6 — Implementar waitForRealtimeStatus em OrderPage
- [x] 2.6.1 Adicionar locator para timeline de status em `OrderPage.ts`

**Verification**:
- **Run**: `grep -E "timeline|status.*timeline" tests/e2e/pages/OrderPage.ts -i`
- **Expected**: Locator para timeline de status definido
- [x] 2.6.2 Implementar `waitForRealtimeStatus(status, timeout?)` com Supabase channel

**Verification**:
- **Run**: `grep -A10 "waitForRealtimeStatus" tests/e2e/pages/OrderPage.ts | grep "channel\|subscribe"`
- **Expected**: Método implementa subscription de canal realtime
- [x] 2.6.3 Implementar polling fallback a cada 2s se realtime falhar

**Verification**:
- **Run**: `grep -E "2.*second|polling|fallback" tests/e2e/pages/OrderPage.ts -i`
- **Expected**: Fallback polling implementado
- [x] 2.6.4 Implementar `getStatusTimelineEntries()` retornando `Promise<TimelineEntry[]>`

**Verification**:
- **Run**: `grep -A5 "getStatusTimelineEntries.*Promise" tests/e2e/pages/OrderPage.ts`
- **Expected**: Método retorna `Promise<TimelineEntry[]>`

### 2.7 — Criar realtime-updates.spec.ts
- [x] 2.7.1 Criar teste: admin atualiza status → cliente recebe update via realtime

**Verification**:
- **Run**: `ls tests/e2e/tests/admin/realtime-updates.spec.ts && grep -E "admin.*update.*status|realtime.*update" tests/e2e/tests/admin/realtime-updates.spec.ts -i`
- **Expected**: Arquivo existe e cobre update via realtime
- [x] 2.7.2 Criar teste: timeline de status atualiza sem page reload

**Verification**:
- **Run**: `grep -E "timeline.*update|no.*reload|without.*reload" tests/e2e/tests/admin/realtime-updates.spec.ts -i`
- **Expected**: Teste valida update de timeline sem reload
- [x] 2.7.3 Criar teste: fallback polling ativa quando realtime falha

**Verification**:
- **Run**: `grep -E "fallback|polling.*fallback" tests/e2e/tests/admin/realtime-updates.spec.ts -i`
- **Expected**: Teste cobre fallback polling
- [x] 2.7.4 Criar teste: conexão realtime perdida mostra indicador de status

**Verification**:
- **Run**: `grep -E "realtime.*disconnect|connection.*lost|status.*indicator" tests/e2e/tests/admin/realtime-updates.spec.ts -i`
- **Expected**: Teste valida indicador de status de conexão

### 2.8 — Completar AdminProductsPage com métodos de busca
- [x] 2.8.1 Implementar `searchProducts(query)` retornando `Promise<number>`

**Verification**:
- **Run**: `grep -A10 "searchProducts" tests/e2e/pages/AdminProductsPage.ts | grep "Promise<number>"`
- **Expected**: Método retorna `Promise<number>` com contagem
- [x] 2.8.2 Implementar `filterByCategory(categoryName)` retornando `Promise<number>`

**Verification**:
- **Run**: `grep -A10 "filterByCategory" tests/e2e/pages/AdminProductsPage.ts | grep "Promise<number>"`
- **Expected**: Método retorna `Promise<number>` com contagem
- [x] 2.8.3 Adicionar waitForResponse após cada operação

**Verification**:
- **Run**: `grep "waitForResponse" tests/e2e/pages/AdminProductsPage.ts | wc -l`
- **Expected**: `waitForResponse()` presente após operações

## Phase 3: Consolidação (2 dias)

### 3.1 — Assertions fortes em admin/orders.spec.ts
- [x] 3.1.1 Remover todas assertions condicionais (`if (count > 0)`)

**Verification**:
- **Run**: `grep -E "if.*count.*>|count.*>.*0" tests/e2e/tests/admin/orders.spec.ts`
- **Expected**: Nenhuma assertion condicional encontrada
- [x] 3.1.2 Adicionar assertion de contagem em todos os filtros de status

**Verification**:
- **Run**: `grep -E "filterByStatus.*expect|expect.*filterByStatus" tests/e2e/tests/admin/orders.spec.ts | wc -l`
- **Expected**: Assertions de contagem após cada filtro de status
- [x] 3.1.3 Adicionar assertion de contagem em todas as buscas por email

**Verification**:
- **Run**: `grep -E "searchByCustomerEmail.*expect|expect.*searchByCustomerEmail" tests/e2e/tests/admin/orders.spec.ts | wc -l`
- **Expected**: Assertions de contagem após cada busca por email
- [x] 3.1.4 Garantir que seed data tem dados suficientes para todos os filtros

**Verification**:
- **Run**: `grep -E "seed|beforeEach" tests/e2e/tests/admin/orders.spec.ts | head -10`
- **Expected**: Seed configurado com dados para filtros

### 3.2 — Assertions fortes em admin/products.spec.ts
- [x] 3.2.1 Adicionar assertion de contagem após `searchProducts()`

**Verification**:
- **Run**: `grep -A3 "searchProducts" tests/e2e/tests/admin/products.spec.ts | grep "expect.*count\|expect.*greater"`
- **Expected**: Assertions de contagem após searchProducts
- [x] 3.2.2 Adicionar assertion de contagem após `filterByCategory()`

**Verification**:
- **Run**: `grep -A3 "filterByCategory" tests/e2e/tests/admin/products.spec.ts | grep "expect.*count\|expect.*greater"`
- **Expected**: Assertions de contagem após filterByCategory
- [x] 3.2.3 Validar que todos os resultados contém termo buscado

**Verification**:
- **Run**: `grep -E "toContain|text.*contain" tests/e2e/tests/admin/products.spec.ts | wc -l`
- **Expected**: Validações de conteúdo nos resultados
- [x] 3.2.4 Testar estado vazio quando busca não retorna resultados

**Verification**:
- **Run**: `grep -E "empty|zero.*result|no.*result" tests/e2e/tests/admin/products.spec.ts -i`
- **Expected**: Teste de estado vazio implementado

### 3.3 — Assertions fortes em admin/categories.spec.ts
- [x] 3.3.1 Adicionar assertion de contagem em buscas de categorias

**Verification**:
- **Run**: `grep "expect.*count" tests/e2e/tests/admin/categories.spec.ts | wc -l`
- **Expected**: Múltiplas assertions de contagem em buscas
- [x] 3.3.2 Validar que resultados correspondem ao termo buscado

**Verification**:
- **Run**: `grep -E "toContain|text.*match" tests/e2e/tests/admin/categories.spec.ts | wc -l`
- **Expected**: Validações de correspondência de busca
- [x] 3.3.3 Completar locator `categoryDescriptionInput` se ainda pendente

**Verification**:
- **Run**: `grep "categoryDescriptionInput" tests/e2e/pages/AdminCategoriesPage.ts tests/e2e/tests/admin/categories.spec.ts`
- **Expected**: Locator usado em testes ou page object

### 3.4 — Assertions em checkout.spec.ts
- [x] 3.4.1 Verificar que checkout valida mandatory modifiers antes de permitir pagamento

**Verification**:
- **Run**: `grep -E "mandatory.*modifier|required.*modifier|validation.*error" tests/e2e/tests/customer/checkout.spec.ts -i | head -5`
- **Expected**: Validação de modifiers mandatórios no checkout
- [x] 3.4.2 Adicionar assertion de validation error quando mandatory modifier ausente

**Verification**:
- **Run**: `grep -E "expect.*validation|validation.*expect" tests/e2e/tests/customer/checkout.spec.ts -i`
- **Expected**: Assertion de erro de validação presente
- [x] 3.4.3 Verificar que total no checkout reflete modifiers e combos corretamente

**Verification**:
- **Run**: `grep -E "checkout.*total|total.*modifier|total.*combo" tests/e2e/tests/customer/checkout.spec.ts -i`
- **Expected**: Validação de total com modifiers e combos

### 3.5 — Atualizar README.md com matriz de coverage
- [x] 3.5.1 Documentar todos os fluxos cobertos em `tests/e2e/README.md`

**Verification**:
- **Run**: `grep -E "fluxo|flow|coverage" tests/e2e/README.md -i | wc -l`
- **Expected**: README.md contém matriz de coverage documentada
- [x] 3.5.2 Criar `tests/e2e/FLUXOS.md` detalhando cada fluxo coberto

**Verification**:
- **Run**: `ls tests/e2e/FLUXOS.md && wc -l tests/e2e/FLUXOS.md`
- **Expected**: Arquivo FLUXOS.md existe com conteúdo
- [x] 3.5.3 Atualizar matriz de coverage com colunas: fluxo, spec file, status

**Verification**:
- **Run**: `grep -E "spec.*file|status|@smoke|@slow" tests/e2e/README.md | head -10`
- **Expected**: Matriz com colunas fluxo, spec file, status
- [x] 3.5.4 Documentar tagging `@smoke`, `@slow` e tempos estimados

**Verification**:
- **Run**: `grep -E "@smoke|@slow|tempo|time" tests/e2e/README.md -i | head -10`
- **Expected**: Tags e tempos documentados

### 3.6 — Rollback e feature flags
- [x] 3.6.1 Renomear specs antigas com mock para `.mock.spec.ts`

**Verification**:
- **Run**: `ls tests/e2e/tests/**/*.mock.spec.ts 2>/dev/null | head -5`
- **Expected**: Arquivos .mock.spec.ts existem para specs antigas
- [x] 3.6.2 Adicionar feature flag `E2E_SKIP_NEW_TESTS=true` para disable

**Verification**:
- **Run**: `grep -r "E2E_SKIP_NEW_TESTS" tests/e2e/`
- **Expected**: Feature flag configurado
- [x] 3.6.3 Verificar que `playwright.minimal.config.ts` continua rodando auth.spec

**Verification**:
- **Run**: `grep "auth.spec" tests/e2e/playwright.minimal.config.ts`
- **Expected**: auth.spec configurado no runner minimal

---

## Metadados

| Campo | Valor |
|-------|-------|
| Change | 2026-04-24-melhoria-e2e |
| Pipeline | accelerated |
| Fases | 3 |
| Total Tasks | 42 |
| Phase 1 | 17 tasks |
| Phase 2 | 18 tasks |
| Phase 3 | 7 tasks |

## Ordem de Execução

Executar Phase 1 primeiro (Quick Wins) —foundation para toda a suíte. Phase 2 (Fluxos Completos) depende do seed expandido da Phase 1. Phase 3 (Consolidação) depende de todos os novos testes estarём implementados e pode ser executado em paralelo com ajustes de Phase 2.
