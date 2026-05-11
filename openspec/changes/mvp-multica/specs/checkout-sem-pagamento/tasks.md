# Tasks: Checkout Sem Pagamento

## Specs

- [x] `openspec/changes/mvp-multica/specs/checkout-sem-pagamento/spec.md` — RFC 2119 spec
- [x] `openspec/changes/mvp-multica/specs/checkout-sem-pagamento/design.md` — Arquitetura e arquivos

---

## Implementação

### 1. Backend — Ajustar FSM de Pedido

#### 1.1 Modificar PedidoAggregate

- [ ] Ajustar transições de status (remover `pending_payment`)
- [ ] Status inicial = `recebido`
- [ ] Manter transições: `recebido` → `preparando` → `pronto` → `entregue`
- [ ] Permitir `cancelado` de qualquer estado exceto `entregue`

**Arquivo:** `src/domain/pedido/aggregates/PedidoAggregate.ts`

#### 1.2 Criar Pedido via API

- [ ] `POST /api/pedidos` cria pedido com status `recebido`
- [ ] Validar: `restaurantId`, `mesaId`, `itens` não vazios
- [ ] Persistir em IndexedDB (offline-first)
- [ ] Retornar `{ id, status, createdAt }`

**Arquivo:** `src/app/api/pedidos/route.ts`

#### 1.3 Remover dependência de pagamento no pedido

- [ ] Remover campo `pagamentoId` do Pedido (MVP não tem)
- [ ] Remover método `definirPagamento()` se existir
- [ ] Remover evento `PagamentoConfirmado` do fluxo (não existe mais)

---

### 2. Frontend — Checkout Page

#### 2.1 Simplificar checkout page

- [ ] Remover `PaymentSelector` component
- [ ] Remover estado `paymentMethod`
- [ ] Remover lógica condicional para PIX/Card
- [ ] Botão: "Enviar Pedido" (não mais "Finalizar Pedido")

**Arquivo:** `src/app/(customer)/checkout/page.tsx`

#### 2.2 Novo fluxo de submit

- [ ] `handleSubmit()` → `submitOrder()`
- [ ] Chamar API `/api/pedidos` (POST)
- [ ] Se sucesso: redirecionar para `/pedido/{id}`
- [ ] Se erro: mostrar toast de erro

**Arquivo:** `src/app/(customer)/checkout/page.tsx`

#### 2.3 Atualizar cartStore

- [ ] Adicionar método `submitOrder(restaurantId, mesaId)`
- [ ] Método faz POST para `/api/pedidos`
- [ ] Após sucesso: limpar carrinho (`items = []`)
- [ ] Persistir em IndexedDB

**Arquivo:** `src/stores/cartStore.ts`

---

### 3. Limpeza de Código

#### 3.1 Deletar componentes de pagamento

- [ ] Deletar `src/app/(customer)/checkout/components/PaymentSelector.tsx`
- [ ] Deletar `src/app/(customer)/checkout/components/PixQRCode.tsx`
- [ ] Deletar `src/app/(customer)/checkout/components/CardPayment.tsx`
- [ ] Deletar `src/components/payment/` (se existir)

#### 3.2 Atualizar imports

- [ ] Remover imports de componentes de pagamento deletados
- [ ] Verificar se há `usePayment`, `usePix` hooks e deletar se não usados

---

### 4. Testes

#### 4.1 Testes Unitários

- [ ] `tests/unit/domain/pedido/aggregates/PedidoAggregate.test.ts`
  - Criar pedido com status `recebido`
  - Validar transições: `recebido` → `preparando` → `pronto` → `entregue`
  - Validar que `pending_payment` não é mais usado

- [ ] `tests/unit/application/pedido/services/CriarPedidoUseCase.test.ts`
  - Criar pedido sem dados de pagamento
  - Validar status retornado = `recebido`

#### 4.2 Testes E2E

- [ ] `tests/e2e/customer/checkout-no-payment.spec.ts`
  - Navegar para checkout
  - Verificar que não há seleção de pagamento
  - Clicar "Enviar Pedido"
  - Verificar redirect para `/pedido/{id}`
  - Verificar status `recebido` aparece

- [ ] `tests/e2e/kitchen/kds-new-order.spec.ts`
  - KDS recebe pedido com status `recebido`
  - Verificar que pedido aparece na lista

---

### 5. Verificação

- [ ] `npm run build` passa
- [ ] `npm run lint` passa
- [ ] `npm run test` passa (todos os testes)
- [ ] Coverage >= 80%

---

## Task Metadata

```yaml
sdd: checkout-sem-pagamento
spec_file: specs/checkout-sem-pagamento/spec.md
design_file: specs/checkout-sem-pagamento/design.md
priority: high
blocking: true  # É a base para as outras tasks do MVP
```

---

## Dependencies

Nenhuma — esta é a primeira task do MVP.

---

## Progress

```
[  0/18] tarefas completas
```
