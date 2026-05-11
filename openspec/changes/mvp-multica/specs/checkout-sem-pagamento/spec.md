# Spec: Checkout Sem Pagamento — MVP Multica

## 1. Overview

**Bounded Context:** pedido, checkout
**Scope:** Checkout redireciona pedido direto para cozinha (KDS) sem etapa de pagamento online
**Status:** draft

---

## 2. Definições

| Termo | Definição |
|-------|-----------|
| **Checkout** | Fluxo onde cliente revisa carrinho e envia pedido |
| **KDS** | Kitchen Display System — tela da cozinha para ver pedidos |
| **Pedido** | Aggregate que representa um pedido do cliente |

---

## 3. FSM de Pedido (MVP)

```
recebido → preparando → pronto → entregue
    │           │          │         │
    │           │          │         └── Cliente pagou e recebeu
    │           │          └── Cliente é notificado
    │           └── Cozinha começou preparo
    └── Pedido criado, aguardando preparo
```

### 3.1 Status

| Status | Descrição | Quem atualiza |
|--------|-----------|---------------|
| `recebido` | Pedido criado, enviado para cozinha | Sistema |
| `preparando` | Cozinha está preparando | KDS (cozinheiro) |
| `pronto` | Pedido está pronto para entrega | KDS (cozinheiro) |
| `entregue` | Cliente recebeu o pedido | KDS (garçom) |
| `cancelado` | Pedido cancelado | Admin |

---

## 4. Funcionalidade: Checkout Sem Pagamento

### 4.1 Fluxo

```
Carrinho (review)
    ↓
Botão "Enviar Pedido"
    ↓
Validação: carrinho não vazio, restaurantId existe
    ↓
POST /api/pedidos → Cria pedido com status "recebido"
    ↓
Limpar carrinho local
    ↓
Redirecionar para /pedido/[pedidoId] (acompanhamento)
```

### 4.2 Diferenças do Checkout Atual

| Antes (com pagamento) | Depois (MVP) |
|-----------------------|--------------|
| Seleção de método pagamento | Não existe |
| Integração PIX/MercadoPago | Não existe |
| Status `pending_payment` | Status `recebido` direto |
| Webhook de confirmação | Não existe |
| Redirect para pagamento | Redirect para tracking |

---

## 5. API Endpoints

### POST /api/pedidos

**Request:**
```json
{
  "restaurantId": "uuid",
  "mesaId": "uuid",
  "itens": [
    {
      "produtoId": "uuid",
      "quantidade": 2,
      "modificadores": [
        { "grupoId": "uuid", "valorId": "uuid" }
      ],
      "observacao": "sem cebola"
    }
  ],
  "observacao": "mesa 5, varanda"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "status": "recebido",
  "createdAt": "2026-05-11T12:00:00Z",
  "itens": [...],
  "total": 45.90
}
```

### GET /api/pedidos/[id]

**Response (200):**
```json
{
  "id": "uuid",
  "status": "preparando",
  "restaurantId": "uuid",
  "mesaId": "uuid",
  "itens": [...],
  "total": 45.90,
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 6. Frontend Changes

### 6.1 Página de Checkout Atual

**Rota:** `/src/app/(customer)/checkout/page.tsx`

**Mudanças:**
1. Remover seleção de método de pagamento
2. Remover integração PIX
3. Remover redirect para página de pagamento
4. Botão muda de "Finalizar Pedido" → "Enviar Pedido"

### 6.2 Comportamento do Botão

**Antes:**
```typescript
onClick={() => {
  if (paymentMethod === 'pix') {
    redirectToPixPayment();
  } else {
    redirectToCardPayment();
  }
}}
```

**Depois:**
```typescript
onClick={() => {
  submitOrder(); // Cria pedido com status "recebido"
  redirectToOrderTracking(orderId);
}}
```

---

## 7. Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/stores/cartStore.ts` | Método `submitOrder()` |
| `src/app/(customer)/checkout/page.tsx` | Remover seleção pagamento |
| `src/app/(customer)/checkout/components/PaymentSelector.tsx` | Deletar |
| `src/components/payment/` | Deletar pasta (MVP não usa) |
| `src/app/api/pedidos/route.ts` | Status inicial = `recebido` |
| `src/domain/pedido/aggregates/PedidoAggregate.ts` | FSM ajustada |

---

## 8. Regras de Negócio

### 8.1 Criação de Pedido

| Regra | Validação |
|-------|-----------|
| Carrinho não vazio | `itens.length > 0` |
| RestaurantId válido | UUID format |
| MesaId válido | UUID format |
| Quantidade > 0 | Para cada item |

### 8.2 Status Transitions

| De | Para | Permitido? |
|----|------|------------|
| `recebido` | `preparando` | ✅ |
| `recebido` | `cancelado` | ✅ |
| `preparando` | `pronto` | ✅ |
| `preparando` | `cancelado` | ✅ |
| `pronto` | `entregue` | ✅ |
| `pronto` | `cancelado` | ✅ |

---

## 9. Casos de Teste

### Gherkin

```gherkin
Funcionalidade: Checkout Sem Pagamento

  Cenário: Cliente envia pedido com sucesso
    Dado que o cliente tem itens no carrinho
    E o restaurante está ativo
    Quando o cliente clica em "Enviar Pedido"
    Então o pedido é criado com status "recebido"
    E o cliente é redirecionado para página de acompanhamento
    E o carrinho é limpo

  Cenário: Cliente tenta enviar carrinho vazio
    Dado que o carrinho está vazio
    Quando o cliente clica em "Enviar Pedido"
    Então uma mensagem de erro é exibida
    E o pedido não é criado

  Cenário: KDS recebe novo pedido
    Dado que um pedido foi criado com status "recebido"
    Quando o KDS é atualizado
    Então o pedido aparece na lista do KDS
    E o tempo desde criação é exibido
```

---

## 10. Critérios de Aceitação

- [ ] Cliente consegue enviar pedido sem selecionar pagamento
- [ ] Pedido é criado com status `recebido` (não `pending_payment`)
- [ ] Cliente é redirecionado para página de acompanhamento
- [ ] Carrinho é limpo após envio
- [ ] KDS mostra pedido imediatamente após criação
- [ ] FSM permite transição `recebido` → `preparando` → `pronto` → `entregue`
- [ ] Arquivos de pagamento (PIX, Stripe) não são carregados no checkout
- [ ] Tests E2E passam para novo fluxo

---

## 11. Out of Scope

- Pagamento online (PIX, cartão)
- Reembolso
- Estornos
-split de conta
- Comandas impressas

---

## 12. Notes

- O bounded context de `pagamento` continua existindo no código mas não é usado no MVP
- Futuramente podemos adicionar `pagamento_na_entrega` como opção
