# Proposal: Plano de Validação Completa de Testes

## Intent

Criar um **plano estruturado de validação** que garante que todos os fluxos da aplicação Pedi-AI sejam verificados através de testes em três níveis:

1. **Testes Unitários** — Regras de negócio puras (domain layer)
2. **Testes de Integração** — Use cases, repositories e API routes
3. **Testes E2E** — Fluxos completos de usuário (cliente e admin)

O objetivo é garantir **100% de cobertura dos fluxos documentados** em `docs/FLUXOS-CONSUMIDOR.md` e `docs/FLUXOS-ADMIM.md`, com métricas claras e blockers de merge.

---

## Scope

### In Scope

- **Bounded Contexts a cobrir:**
  - `autenticacao/` — Login, logout, registro, recuperação de senha
  - `cardapio/` — Categorias, produtos, combos, modificadores
  - `mesa/` — QR codes, mesas, validação
  - `pedido/` — Criação, status, cancelamento, histórico
  - `pagamento/` — Pix, webhook, reembolso
  - `admin/` — Restaurantes, equipe, dashboard, analytics

- **Tipos de teste:**
  - Unit tests (Vitest) — Domain entities, value objects, aggregates, services
  - Integration tests (Vitest) — Use cases com mocks de repositórios
  - E2E tests (Playwright) — Fluxos completos de usuário

- **Métricas de cobertura:**
  - Statements: 80% mínimo
  - Branches: 80% mínimo
  - Functions: 80% mínimo
  - Lines: 80% mínimo

### Out of Scope

- Testes de performance (load testing)
- Testes de segurança (penetration testing)
- Testes de DB migration (já coberto em CI)
- Testes de infraestrutura (Supabase, deploy)

---

## Approach

### 1. Estrutura de Diretórios de Testes

```
tests/
├── unit/                          # Testes unitários (Vitest)
│   ├── domain/
│   │   ├── autenticacao/
│   │   │   ├── entities/
│   │   │   │   ├── Usuario.test.ts
│   │   │   │   └── Sessao.test.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── Papel.test.ts
│   │   │   │   └── Credenciais.test.ts
│   │   │   └── aggregates/
│   │   │       └── UsuarioAggregate.test.ts
│   │   ├── cardapio/
│   │   │   ├── entities/
│   │   │   │   ├── Categoria.test.ts
│   │   │   │   ├── ItemCardapio.test.ts
│   │   │   │   └── Combo.test.ts
│   │   │   ├── value-objects/
│   │   │   │   └── LabelDietetico.test.ts
│   │   │   └── aggregates/
│   │   │       ├── ModificadorGrupoAggregate.test.ts
│   │   │       └── ComboAggregate.test.ts
│   │   ├── mesa/
│   │   │   ├── entities/
│   │   │   │   └── Mesa.test.ts
│   │   │   └── aggregates/
│   │   │       └── MesaAggregate.test.ts
│   │   ├── pedido/
│   │   │   ├── entities/
│   │   │   │   ├── Pedido.test.ts
│   │   │   │   └── ItemPedido.test.ts
│   │   │   ├── value-objects/
│   │   │   │   └── StatusPedido.test.ts
│   │   │   └── aggregates/
│   │   │       ├── PedidoAggregate.test.ts
│   │   │       └── CarrinhoAggregate.test.ts
│   │   ├── pagamento/
│   │   │   ├── entities/
│   │   │   │   ├── Pagamento.test.ts
│   │   │   │   └── Transacao.test.ts
│   │   │   └── aggregates/
│   │   │       └── PagamentoAggregate.test.ts
│   │   └── shared/
│   │       └── value-objects/
│   │           └── Dinheiro.test.ts
│   └── application/
│       ├── autenticacao/
│       │   ├── services/
│       │   │   ├── AutenticarUsuarioUseCase.test.ts
│       │   │   └── RegistrarUsuarioUseCase.test.ts
│       ├── cardapio/
│       │   └── services/
│       │       ├── ListarCardapioUseCase.test.ts
│       │       └── ObterDetalheProdutoUseCase.test.ts
│       ├── mesa/
│       │   └── services/
│       │       └── ValidarQRCodeUseCase.test.ts
│       ├── pedido/
│       │   └── services/
│       │       ├── CriarPedidoUseCase.test.ts
│       │       └── AlterarStatusPedidoUseCase.test.ts
│       └── pagamento/
│           └── services/
│               └── ProcessarWebhookUseCase.test.ts
│
├── integration/                   # Testes de integração (Vitest)
│   ├── repositories/
│   │   ├── PedidoRepository.test.ts
│   │   ├── CarrinhoRepository.test.ts
│   │   ├── CategoriaRepository.test.ts
│   │   └── PagamentoRepository.test.ts
│   └── api/
│       ├── restaurants.test.ts
│       ├── orders.test.ts
│       └── webhooks/
│           └── pix.test.ts
│
└── e2e/                          # Testes E2E (Playwright) — já existente
    ├── tests/
    │   ├── customer/
    │   ├── admin/
    │   ├── waiter/
    │   └── offline/
    └── README.md
```

### 2. Matriz de Cobertura por Fluxo

#### Fluxos do Consumidor

| # | Fluxo | Unitários | Integração | E2E | Tags |
|---|-------|-----------|-----------||-----|------|
| 1 | Acesso ao Cardápio (QR Code) | MesaAggregate.validateQR() | — | table-qr.spec.ts | @smoke |
| 2 | Acesso ao Cardápio (Delivery) | — | GET /api/restaurants | restaurants.spec.ts | @smoke |
| 3 | Autenticação (Login) | AutenticarUsuarioUseCase | API /auth | auth.spec.ts | @critical |
| 4 | Registro | RegistrarUsuarioUseCase | API /auth/register | register.spec.ts | @smoke |
| 5 | Navegação no Cardápio | Categoria, ItemCardapio | ListarCardapioUseCase | menu.spec.ts | — |
| 6 | Adição ao Carrinho | CarrinhoAggregate.addItem() | CarrinhoRepository | cart.spec.ts | — |
| 7 | Gerenciamento do Carrinho | CarrinhoAggregate | CarrinhoRepository | cart.spec.ts | — |
| 8 | Checkout | CriarPedidoUseCase | API /orders | checkout.spec.ts | @smoke, @critical |
| 9 | Pagamento Pix | PagamentoAggregate | PixAdapter, Webhook | pix.spec.ts, payment.spec.ts | @slow |
| 10 | Acompanhamento do Pedido | PedidoAggregate, StatusPedido FSM | API /orders/:id | order.spec.ts | @slow |
| 11 | Cancelamento | PedidoAggregate.cancel() | API /orders/:id | order.spec.ts | — |
| 12 | Offline (Cache) | — | CardapioSyncService | offline.spec.ts | — |
| 13 | Offline (Pedido) | — | BackgroundSync | offline.spec.ts | — |
| 14 | Recuperação de Senha | RedefinirSenhaUseCase | API /auth/reset | password-recovery.spec.ts | — |
| 15 | Reordenação | — | API /orders/:id/reorder | order.spec.ts | — |
| 16 | Histórico de Pedidos | ObterHistoricoPedidosUseCase | API /orders | order.spec.ts | — |

#### Fluxos do Administrador

| # | Fluxo | Unitários | Integração | E2E | Tags |
|---|-------|-----------|-----------||-----|------|
| 1 | Login Admin | AutenticarUsuarioUseCase + RBAC | API /auth | admin/auth.spec.ts | @critical |
| 2 | Gerenciamento Restaurantes | Restaurante entity | CRUD repos | multi-restaurant.spec.ts | — |
| 3 | Gerenciamento Equipe | UsuarioAggregate + RBAC | API /team | — | — |
| 4 | Convite Membro | RegistrarUsuarioUseCase | API /team/invite | — | — |
| 5 | CRUD Categorias | GerenciarCategoriaUseCase | CategoriaRepository | categories.spec.ts | — |
| 6 | CRUD Produtos | GerenciarProdutoUseCase | ItemCardapioRepository | products.spec.ts | — |
| 7 | CRUD Modificadores | ModificadorGrupoAggregate | API /modifiers | modifier-groups.spec.ts | — |
| 8 | CRUD Combos | ComboAggregate | ComboRepository | combos-admin.spec.ts | — |
| 9 | CRUD Mesas | MesaAggregate | MesaRepository | table-qr.spec.ts | — |
| 10 | Gerenciamento Pedidos | AlterarStatusPedidoUseCase | PedidoRepository | orders.spec.ts | — |
| 11 | Painel Cozinha | — | Realtime subscription | kitchen.spec.ts | @slow |
| 12 | Realtime Updates | — | Supabase realtime | realtime-updates.spec.ts | — |
| 13 | Dashboard/Analytics | ObterEstatisticasUseCase | EstatisticasRepository | analytics.spec.ts | — |
| 14 | Seletor Restaurant | — | Context + API | multi-restaurant.spec.ts | — |
| 15 | Recuperação de Senha | RedefinirSenhaUseCase | API /auth/reset | — | — |

### 3. Estratégia de Testes Unitários

#### Domain Entities

```typescript
// Exemplo: Pedido.test.ts
describe('Pedido Entity', () => {
  describe('Status Transitions', () => {
    it('deve permitir transição de pending_payment para paid', () => {
      const pedido = Pedido.create({ ... });
      expect(pedido.canTransitionTo('paid')).toBe(true);
    });

    it('não deve permitir transição de delivered para preparing', () => {
      const pedido = Pedido.create({ ... });
      pedido.status = 'delivered';
      expect(pedido.canTransitionTo('preparing')).toBe(false);
    });
  });

  describe('Business Rules', () => {
    it('deve criar pedido com pelo menos 1 item', () => {
      expect(() => Pedido.create({ itens: [] })).toThrow();
    });

    it('deve calcular total como soma dos subtotais', () => {
      const pedido = Pedido.create({ itens: [item1, item2] });
      expect(pedido.total).toBe(item1.subtotal + item2.subtotal);
    });
  });
});
```

#### Value Objects

```typescript
// Exemplo: StatusPedido.test.ts
describe('StatusPedido', () => {
  it('deve ter valores válidos corretos', () => {
    expect(StatusPedido.VALID_VALUES).toEqual([
      'pending_payment', 'paid', 'received', 'preparing',
      'ready', 'delivered', 'rejected', 'cancelled', 'refunded'
    ]);
  });

  it('não deve permitir status inválido', () => {
    expect(() => new StatusPedido('invalid')).toThrow();
  });
});
```

#### Aggregates

```typescript
// Exemplo: CarrinhoAggregate.test.ts
describe('CarrinhoAggregate', () => {
  describe('addItem', () => {
    it('deve adicionar item ao carrinho', () => {
      const carrinho = CarrinhoAggregate.create();
      carrinho.addItem(produto, quantidade);
      expect(carrinho.itens).toHaveLength(1);
    });

    it('deve recalcular total ao adicionar item', () => {
      const carrinho = CarrinhoAggregate.create();
      carrinho.addItem(produto, 2);
      expect(carrinho.total).toBe(proto.preco * 2);
    });

    it('deve validar modificadores obrigatórios', () => {
      const produto = createProductWithRequiredModifiers();
      const carrinho = CarrinhoAggregate.create();
      expect(() => carrinho.addItem(produto, 1)).toThrow();
    });
  });
});
```

### 4. Estratégia de Testes de Integração

#### Repositórios (com Dexie in-memory)

```typescript
// Exemplo: PedidoRepository.test.ts
describe('PedidoRepository', () => {
  let db: Dexie;
  let repository: PedidoRepository;

  beforeEach(async () => {
    db = await createTestDatabase();
    repository = new PedidoRepository(db);
  });

  it('deve salvar e recuperar pedido', async () => {
    const pedido = Pedido.create({ ... });
    await repository.save(pedido);
    const retrieved = await repository.findById(pedido.id);
    expect(retrieved).toEqual(pedido);
  });

  it('deve filtrar por clienteId', async () => {
    await repository.save(pedido1); // cliente A
    await repository.save(pedido2); // cliente B
    const results = await repository.findByClienteId('cliente-A');
    expect(results).toHaveLength(1);
    expect(results[0].clienteId).toBe('cliente-A');
  });
});
```

#### API Routes

```typescript
// Exemplo: orders.test.ts
describe('POST /api/orders', () => {
  it('deve criar pedido com dados válidos', async () => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        restaurantId: 'rest-1',
        tableId: 'table-1',
        items: [{ productId: 'prod-1', quantity: 2 }],
        paymentMethod: 'pix'
      })
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.status).toBe('pending_payment');
  });

  it('deve retornar 400 com dados inválidos', async () => {
    const response = await fetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [] }) // inválido
    });

    expect(response.status).toBe(400);
  });
});
```

### 5. Estratégia de Testes E2E

#### Page Objects

```typescript
// Exemplo: CheckoutPage.ts
export class CheckoutPage {
  constructor(private page: Page) {}

  async fillCustomerData(name: string, phone: string) {
    await this.page.getByLabel('Nome').fill(name);
    await this.page.getByLabel('Telefone').fill(phone);
  }

  async selectPixPayment() {
    await this.page.getByText('Pix').click();
  }

  async confirmOrder() {
    await this.page.getByRole('button', { name: 'Confirmar Pedido' }).click();
  }

  async waitForPixQRCode() {
    await expect(this.page.getByText('QR Code Pix')).toBeVisible();
  }
}
```

#### Fluxo Completo

```typescript
// Exemplo: checkout.spec.ts
test('deve completar pedido com Pix', async ({ page }) => {
  // Setup
  await createTestRestaurant();
  await addProductsToRestaurant();

  // Navega ao cardápio
  await page.goto(`/restaurantes/${restaurantId}/cardapio`);

  // Adiciona item ao carrinho
  const menuPage = new MenuPage(page);
  await menuPage.addProductToCart('X-Salada');

  // Vai para checkout
  const cartPage = new CartPage(page);
  await cartPage.proceedToCheckout();

  // Preenche dados e paga
  const checkoutPage = new CheckoutPage(page);
  await checkoutPage.fillCustomerData('João Silva', '11999999999');
  await checkoutPage.selectPixPayment();
  await checkoutPage.confirmOrder();

  // Aguarda QR Code
  await checkoutPage.waitForPixQRCode();
  expect(await checkoutPage.getOrderStatus()).toBe('Aguardando pagamento');
});
```

### 6. Configuração de CI/CD

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm run test:unit
      - uses: codecov/codecov-action@v4

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm run test:integration
      - uses: codecov/codecov-action@v4

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm test:e2e
```

### 7. Script de Cobertura

```bash
# Gerar relatório de cobertura unit + integration
pnpm run test:coverage

# Verificar limiar (80%)
pnpm run test:coverage:check

# Relatório HTML
open coverage/index.html
```

---

## Affected Areas

| Área | Arquivos a Criar | Status Atual |
|------|------------------|--------------|
| **Unit Tests** | `tests/unit/domain/**/` | 0% (a criar) |
| **Unit Tests** | `tests/unit/application/**/` | 0% (a criar) |
| **Integration Tests** | `tests/integration/**/` | 0% (a criar) |
| **Vitest Config** | `vitest.config.ts` | Já existe |
| **Playwright Config** | `playwright.config.ts` | Já existe |

---

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Tempo de execução de testes muito longo | Média | CI/CD lento | Sharding de E2E em 4 shards; unit tests < 2min |
| Testes frágeis (flaky tests) | Alta | Resultados inconsistentes | Retry automático no CI; waits explícitos em E2E |
| Cobertura falsa (mock demais) | Média | Não testa integração real | Testes de integração usam DB real (in-memory) |
| Manutenção de duplicação | Média | Dívida técnica | Page Objects para E2E; factories para dados de teste |

---

## Rollback Plan

1. **Feature Flag:** `ENABLE_TEST_COVERAGE_BLOCK` (default: true)
   - Quando `true`: PR não pode fazer merge se cobertura < 80%
   - Quando `false`: testes rodam mas não bloqueiam merge

2. **Sharding Progressivo:**
   - Fase 1: E2E Customer (@smoke only)
   - Fase 2: E2E Admin (@smoke only)
   - Fase 3: Todos os E2E

---

## Success Criteria

### Cobertura

| Métrica | Limiar |
|---------|--------|
| Statements | ≥ 80% |
| Branches | ≥ 80% |
| Functions | ≥ 80% |
| Lines | ≥ 80% |

### Fluxos Cobertos

| Tipo | Quantidade | Status Atual | Alvo |
|------|------------|-------------|------|
| Unit Tests (domain) | ~50 testes | 0 | 50+ |
| Unit Tests (application) | ~30 testes | 0 | 30+ |
| Integration Tests | ~25 testes | 0 | 25+ |
| E2E Customer (@smoke) | 5 fluxos | ✅ 5 | 5 |
| E2E Admin (@smoke) | 2 fluxos | ✅ 2 | 2 |
| E2E Customer (completo) | 16 fluxos | ✅ 11 | 16 |
| E2E Admin (completo) | 15 fluxos | ✅ 12 | 15 |

### Gates de Merge

1. `pnpm run test:unit` passa (exit 0)
2. `pnpm run test:integration` passa (exit 0)
3. `pnpm run test:coverage:check` ≥ 80%
4. `pnpm test:e2e:smoke` passa (exit 0)
5. `pnpm test:e2e` passa ou marca @slow como opcional

---

## Timeline Proposto

| Fase | Descrição | Semanas |
|------|-----------|---------|
| **Fase 1** | Unit Tests — Domain Entities & Value Objects | 1 |
| **Fase 2** | Unit Tests — Aggregates & Application Use Cases | 1 |
| **Fase 3** | Integration Tests — Repositories | 1 |
| **Fase 4** | Integration Tests — API Routes | 1 |
| **Fase 5** | E2E — Completar fluxos faltantes | 1 |
| **Fase 6** | CI/CD Integration + Coverage Gates | 1 |
| **Total** | — | **6 semanas** |

---

## Open Questions

1. **DB in-memory para integração?** Devemos usar Dexie com dados em memória ou SQLite para testes de repositório?

2. **Testes de webhook Pix?** Precisamos de mock do provedor Pix ou usar Stripe Mock?

3. **Cobertura de edge cases:** Qual o nível de detalhamento esperado para casos de erro (400, 401, 403, 500)?

4. **Testes de realtime?** Como testar Supabase Realtime sem flaky tests? Usar mocks ou skip em CI?
