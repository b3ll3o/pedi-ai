# Design: Checkout Sem Pagamento

## Overview

Modificar o checkout atual para remover a etapa de pagamento online. O pedido será criado diretamente com status `recebido` e redirecionará para a página de acompanhamento.

---

## Mudanças Arquiteturais

### Fluxo Atual (com pagamento)
```
Carrinho → Checkout → Seleção Pagamento → PIX/Card → Pending → Webhook → Paid
                                                           ↓
                                                       KDS recebe
```

### Fluxo MVP (sem pagamento)
```
Carrinho → Checkout → "Enviar Pedido" → Pedido (recebido) → KDS recebe
                                           ↓
                                    Acompanhamento
```

---

## Arquivos a Modificar

### 1. `src/app/(customer)/checkout/page.tsx`

**Mudanças:**
- Remover `PaymentSelector` component
- Remover estado `paymentMethod`
- Botão muda de `Finalizar Pedido` → `Enviar Pedido`
- `handleSubmit` não chama mais `processPayment()`, apenas `submitOrder()`

**Antes:**
```tsx
const handleSubmit = async () => {
  if (paymentMethod === 'pix') {
    await processPixPayment();
  } else {
    await processCardPayment();
  }
};
```

**Depois:**
```tsx
const handleSubmit = async () => {
  const order = await submitOrder();
  router.push(`/pedido/${order.id}`);
};
```

---

### 2. `src/stores/cartStore.ts`

**Adicionar método:**
```typescript
submitOrder: async (restaurantId: string, mesaId: string) => {
  const items = get().items;
  const response = await fetch('/api/pedidos', {
    method: 'POST',
    body: JSON.stringify({ restaurantId, mesaId, itens: items })
  });
  const order = await response.json();
  // Limpar carrinho
  set({ items: [], restaurantId: null, mesaId: null });
  return order;
}
```

---

### 3. `src/app/api/pedidos/route.ts`

**Modificar criação:**
```typescript
// Antes
const pedido = Pedido.criar({
  ...data,
  status: StatusPedido.pending_payment
});

// Depois
const pedido = Pedido.criar({
  ...data,
  status: StatusPedido.recebido
});
```

---

### 4. `src/domain/pedido/aggregates/PedidoAggregate.ts`

**FSM - Ajustar transições:**
```typescript
// Remover transição para pending_payment
const validTransitions = {
  [StatusPedido.recebido]: [StatusPedido.preparando, StatusPedido.cancelado],
  [StatusPedido.preparando]: [StatusPedido.pronto, StatusPedido.cancelado],
  [StatusPedido.pronto]: [StatusPedido.entregue, StatusPedido.cancelado],
  [StatusPedido.entregue]: [],
  [StatusPedido.cancelado]: []
};
```

---

### 5. Deletar Arquivos de Pagamento (MVP não usa)

```bash
# Remover componentes de pagamento
rm -rf src/app/(customer)/checkout/components/PaymentSelector.tsx
rm -rf src/app/(customer)/checkout/components/PixQRCode.tsx
rm -rf src/app/(customer)/checkout/components/CardPayment.tsx

# Remover pasta de pagamento se existir
rm -rf src/components/payment/
```

---

## Novas Dependências

Nenhuma nova dependência. O checkout atual já tem tudo que precisamos.

---

## Testes a Adicionar

### `tests/e2e/customer/checkout-no-payment.spec.ts`

```typescript
test('cliente envia pedido sem pagamento', async ({ page }) => {
  await page.goto('/restaurante/teste/cardapio');
  await page.click('[data-testid="add-item-1"]');
  await page.click('[data-testid="cart-button"]');
  await page.click('[data-testid="checkout-button"]');
  await page.click('[data-testid="send-order-button"]');

  // Verificar redirect para tracking
  await expect(page).toHaveURL(/\/pedido\/.*/);

  // Verificar status
  await expect(page.locator('[data-testid="order-status"]')).toContainText('Recebido');
});
```

---

## Checklist de Implementação

- [ ] Modificar `checkout/page.tsx` — remover seleção pagamento
- [ ] Modificar `cartStore.ts` — adicionar `submitOrder()`
- [ ] Modificar API `/api/pedidos` — status inicial = `recebido`
- [ ] Ajustar FSM em `PedidoAggregate.ts`
- [ ] Deletar componentes de pagamento não usados
- [ ] Atualizar testes E2E
- [ ] Verificar build e tests passam
