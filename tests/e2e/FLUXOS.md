# Fluxos E2E Cobertos — Pedi-AI

Documentação detalhada de todos os fluxos de teste end-to-end.

---

## Cliente

### 1. auth (Autenticação)
- **Spec**: `tests/customer/auth.spec.ts`
- **Tags**: `@smoke`, `@critical`
- **Tempo estimado**: ~15s
- **Fluxo**: Login com credenciais válidas, erro com credenciais inválidas, erro com campos vazios, logout
- **Page Object**: `CustomerLoginPage`

### 2. menu (Cardápio Digital)
- **Spec**: `tests/customer/menu.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~20s
- **Fluxo**: Navegação por categorias, busca de produtos, visualização de detalhes
- **Page Object**: `MenuPage`

### 3. cart (Carrinho)
- **Spec**: `tests/customer/cart.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~25s
- **Fluxo**: Adicionar item, remover item, editar quantidade, limpar carrinho
- **Page Object**: `CartPage`

### 4. checkout (Finalização)
- **Spec**: `tests/customer/checkout.spec.ts`
- **Tags**: `@smoke`, `@slow`
- **Tempo estimado**: ~45s
- **Fluxo**: Revisão do pedido, preenchimento de dados, confirmação
- **Page Object**: `CheckoutPage`

### 5. order (Acompanhamento)
- **Spec**: `tests/customer/order.spec.ts`
- **Tags**: `@slow`
- **Tempo estimado**: ~60s
- **Fluxo**: Status do pedido em tempo real, cancelamento, notificações
- **Page Object**: `OrderPage`

### 6. payment (Pagamento)
- **Spec**: `tests/customer/payment.spec.ts`
- **Tags**: `@slow`
- **Tempo estimado**: ~90s
- **Fluxo**: Seleção de método (PIX, cartão), confirmação, timeout
- **Page Object**: `CheckoutPage`

### 7. offline (Funcionamento Offline)
- **Spec**: `tests/customer/offline.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~30s
- **Fluxo**: Indicador offline, cache do cardápio, fila de operações, sync ao reconectar
- **Page Object**: `MenuPage`, `CartPage`

### 8. combos (Combos — Cliente)
- **Spec**: `tests/customer/combos.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~25s
- **Fluxo**: Adicionar combo ao carrinho, exibição de preçobundle
- **Page Object**: `MenuPage`, `CartPage`

### 9. modifier-groups (Grupos de Modificadores)
- **Spec**: `tests/customer/modifier-groups.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~30s
- **Fluxo**: Validação de modificadores obrigatórios, seleção de opções, preços
- **Page Object**: `MenuPage`, `CartPage`

---

## Administrador

### 10. auth (Autenticação Admin)
- **Spec**: `tests/admin/auth.spec.ts`
- **Tags**: `@smoke`, `@critical`
- **Tempo estimado**: ~15s
- **Fluxo**: Login admin, logout, recuperação de senha
- **Page Object**: `AdminLoginPage`

### 11. categories (Categorias)
- **Spec**: `tests/admin/categories.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~35s
- **Fluxo**: CRUD de categorias, ordenação, visibilidade
- **Page Object**: `AdminCategoriesPage`

### 12. products (Produtos)
- **Spec**: `tests/admin/products.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~40s
- **Fluxo**: CRUD de produtos, precificação, associações
- **Page Object**: `AdminProductsPage`

### 13. orders (Pedidos Admin)
- **Spec**: `tests/admin/orders.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~45s
- **Fluxo**: Lista de pedidos, detalhes, alteração de status
- **Page Object**: `AdminOrdersPage`

### 14. table-qr (Mesas e QR Codes)
- **Spec**: `tests/admin/table-qr.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~30s
- **Fluxo**: Cadastro de mesas, geração de QR codes, download
- **Page Object**: `TableQRPage`

### 15. combos-admin (Combos — Admin)
- **Spec**: `tests/admin/combos-admin.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~35s
- **Fluxo**: Edição de combos, definição de bundle_price
- **Page Object**: `AdminProductsPage`

---

## Realtime

### 16. realtime-updates (Atualizações em Tempo Real)
- **Spec**: `tests/admin/realtime-updates.spec.ts`
- **Tags**: —
- **Tempo estimado**: ~50s
- **Fluxo**: Admin atualiza status, cliente recebe atualização via Supabase realtime
- **Page Objects**: `OrderPage`, `AdminOrdersPage`

### 17. kitchen (Painel da Cozinha)
- **Spec**: `tests/waiter/kitchen.spec.ts`
- **Tags**: `@slow`
- **Tempo estimado**: ~70s
- **Fluxo**: Exibição de pedidos, notificação de novos pedidos, atualização de status
- **Page Object**: `WaiterDashboardPage`

---

## Matriz de Cobertura

| Fluxo | Spec File | Tags | Tempo Est. |
|-------|-----------|------|------------|
| auth (cliente) | `tests/customer/auth.spec.ts` | @smoke, @critical | ~15s |
| menu | `tests/customer/menu.spec.ts` | — | ~20s |
| cart | `tests/customer/cart.spec.ts` | — | ~25s |
| checkout | `tests/customer/checkout.spec.ts` | @smoke, @slow | ~45s |
| order | `tests/customer/order.spec.ts` | @slow | ~60s |
| payment | `tests/customer/payment.spec.ts` | @slow | ~90s |
| offline | `tests/customer/offline.spec.ts` | — | ~30s |
| combos (cliente) | `tests/customer/combos.spec.ts` | — | ~25s |
| modifier-groups | `tests/customer/modifier-groups.spec.ts` | — | ~30s |
| auth (admin) | `tests/admin/auth.spec.ts` | @smoke, @critical | ~15s |
| categories | `tests/admin/categories.spec.ts` | — | ~35s |
| products | `tests/admin/products.spec.ts` | — | ~40s |
| orders | `tests/admin/orders.spec.ts` | — | ~45s |
| table-qr | `tests/admin/table-qr.spec.ts` | — | ~30s |
| combos-admin | `tests/admin/combos-admin.spec.ts` | — | ~35s |
| realtime-updates | `tests/admin/realtime-updates.spec.ts` | — | ~50s |
| kitchen | `tests/waiter/kitchen.spec.ts` | @slow | ~70s |

**Total: 17 fluxos | ~590s (~10 min)**

---

## Tags de Teste

| Tag | Descrição | Uso |
|-----|-----------|-----|
| `@smoke` | Testes essenciais de sanidade | Rodar em CI rápido |
| `@critical` | Fluxos críticos para negócio | Blockers de merge |
| `@slow` | Testes que levam >30s | `pnpm test:e2e:slow` |

## Comandos por Tag

```bash
# Apenas testes rápidos (sem @slow)
pnpm test:e2e:fast

# Apenas testes lentos (@slow)
pnpm test:e2e:slow

# Apenas smoke tests
pnpm test:e2e:smoke

# Apenas testes críticos
pnpm test:e2e:critical
```
