# Proposal: Melhoria de Testes E2E — Cobertura e Confiabilidade

## Intent

Melhorar a cobertura e confiabilidade dos testes E2E do Pedi-AI, eliminando fluxos baseados em dados mockados e substituindo por testes end-to-end com dados reais. Atualmente, 60% dos testes de ordem/pagamento usam IDs hardcoded (ex: `test-order-123`) ao invés de criar pedidos reais via API, resultando em baixa confiança na suíte de testes.

## Scope

### In Scope

1. **Fluxo de Pedido Completo Real**
   - Criar pedido via API → Checkout → Pagamento PIX → Order tracking
   - Validar que pedido aparece no admin orders em tempo real

2. **Testes de Modifiers**
   - Produto com modifier group obrigatório: validar que sem selecionar não permite add to cart
   - Produto com modifier group opcional: validar que é adicionável sem seleção

3. **Testes de Combos**
   - Admin cria combo com bundle price
   - Cliente adiciona combo ao carrinho
   - Validar que bundle price é aplicado corretamente

4. **Correção de Page Objects Incompletos**
   - `AdminCategoriesPage`: adicionar `category-description-input`
   - `AdminProductsPage`: adicionar `product-description-input`, `product-category-select`
   - `AdminOrdersPage`: implementar `getError()`, `filterByStatus()`, `searchByCustomerEmail()` com assertions

5. **Assertions Fortes em Testes de Filtro/Busca**
   - Filtros de orders: verificar contagem de resultados após filtrar
   - Busca de produtos: verificar que só resultados relevantes são retornados
   - Busca de categorias: verificar resultados

6. **Teste de Realtime Updates**
   - Admin atualiza status do pedido → cliente recebe update via Supabase Realtime
   - Validar que timeline de status atualiza sem reload

### Out of Scope

- Testes visuais (screenshot comparison) — considerar em fase posterior
- Testes de performance de E2E (tempos de resposta)
- Testes de estresse/load
- Cobertura de edge cases de payment (falha de cartão, timeout de webhook Stripe)
- Mobile device testing real (apenas desktop Chromium no momento)

## Approach

### Fase 1: Quick Wins (1-2 dias)

1. **Criar fixture de pedido real**
   - Adicionar método `createTestOrder()` no seed ou em utilitário
   - Criar helper `orderUtils.ts` com funções de criação de pedido

2. **Substituir IDs mockados por dados reais**
   - `order.spec.ts`: substituir `/order/test-order-123` por pedido criado via API
   - `payment.spec.ts`: criar PIX order real e verificar confirmação

3. **Completar Page Objects**
   - Adicionar locators faltantes nos POs de admin
   - Implementar métodos com assertions nos POs de orders

### Fase 2: Fluxos Completos (3-4 dias)

4. **Teste de Modifier Groups**
   - Criar produto de teste com modifier obrigatório no seed
   - Testar fluxo: adicionar ao carrinho → validar mandatory selection

5. **Teste de Combos**
   - Admin cria combo via API (no beforeAll)
   - Cliente adiciona combo ao carrinho
   - Validar que `cartStore` calcula bundle price

6. **Teste de Realtime**
   - Usar `waitForChannel()` do Playwright para events Supabase
   - Ou polling com `waitForResponse()` em endpoints relevantes

### Fase 3: Consolidação (2 dias)

7. **Assertions consistentes**
   - Padronizar que todos os filtros/buscas têm assertions de resultado
   - Remover testes condicionais (`if (count > 0)`) — garantir dados no seed

8. **Documentar coverage**
   - Atualizar `tests/e2e/README.md` com matriz de coverage atualizada
   - Adicionar FLUXOS.md detalhando cada fluxo coberto

## Affected Areas

| Área | Arquivo(s) | Impacto |
|------|------------|---------|
| Testes Cliente | `tests/e2e/tests/customer/order.spec.ts` | Alto — reescrever maioria dos testes |
| Testes Cliente | `tests/e2e/tests/customer/payment.spec.ts` | Alto — adicionar PIX real |
| Testes Cliente | `tests/e2e/tests/customer/checkout.spec.ts` | Médio — adicionar modifier/combo |
| Testes Admin | `tests/e2e/tests/admin/orders.spec.ts` | Alto — assertions + realtime |
| Testes Admin | `tests/e2e/tests/admin/products.spec.ts` | Médio — PO incompleto |
| Testes Admin | `tests/e2e/tests/admin/categories.spec.ts` | Baixo — PO incompleto |
| Page Objects | `tests/e2e/pages/*.ts` | Alto — adicionar locators e métodos |
| Seed | `tests/e2e/scripts/seed.ts` | Médio — adicionar produtos com modifiers, combos |
| Helpers | `tests/e2e/tests/shared/helpers/` | Médio — criar utilitários |

## Risks

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| PIX payment test é lento (aguarda webhook) | Alta | Baixo | Usar mock de webhook ou aceitar timeout de 120s |
| Dados de seed colliding com testes paralelos | Média | Alto | Usar UUID único por sessão; isolar por worker |
| Realtime flaky em CI | Alta | Médio | Implementar polling fallback; não bloquear CI |
| Tempo de execução aumenta significativamente | Alta | Médio | Otimizar com sharding; separar @slow em CI-only |
| Seed falha em ambiente limpo | Média | Alto | Garantir idempotência; cleanup antes de cada run |

## Rollback Plan

1. Manter specs antigas em `tests/e2e/tests/customer/order.mock.spec.ts` (renomear ao invés de deletar)
2. Feature flags para disable de testes novos via env `E2E_SKIP_NEW_TESTS=true`
3. Runner minimal: `playwright.minimal.config.ts` continua rodando só auth.spec

## Success Criteria

- [ ] 100% dos fluxos principais têm teste E2E com dados reais
- [ ] Zero IDs hardcoded em testes de order/payment (substituir por criação via API)
- [ ] Page Objects completados — todos os locators necessários presentes
- [ ]Assertions nos testes de filtro/busca — nenhum teste "chama método mas não verifica"
- [ ] Tempo de execução E2E < 15min em CI (4 shards)
- [ ] Taxa de flakes < 5% (retry 1x é aceitável, 2x+ é problema)
- [ ] README.md atualizado com matriz de coverage documentando cada fluxo
