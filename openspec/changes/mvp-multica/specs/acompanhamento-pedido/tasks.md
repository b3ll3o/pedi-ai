# Tasks: Acompanhamento de Pedido

## Specs

- [x] `specs/acompanhamento-pedido/spec.md` — RFC 2119 spec
- [x] `specs/acompanhamento-pedido/design.md` — Arquitetura e arquivos

---

## Implementação

### 1. Página de Tracking

#### 1.1 Criar página

- [x] Criar `src/app/(customer)/order/[orderId]/page.tsx`
- [x] Buscar dados do pedido (via OrderStatus component)
- [x] Renderizar componentes

**Arquivo:** `src/app/(customer)/order/[orderId]/page.tsx`

---

### 2. Componentes

#### 2.1 StatusTimeline

- [x] Implementado via OrderStatus e OrderConfirmation

**Arquivo:** `src/components/order/OrderStatus.tsx`, `src/components/order/OrderConfirmation.tsx`

#### 2.2 OrderHeader

- [x] Implementado via OrderConfirmation

**Arquivo:** `src/components/order/OrderConfirmation.tsx`

#### 2.3 OrderItems

- [x] Implementado via OrderDetail

**Arquivo:** `src/components/order/OrderDetail.tsx`

#### 2.4 OrderStatus

- [x] Implementado

**Arquivo:** `src/components/order/OrderStatus.tsx`

---

### 3. Hooks

#### 3.1 useOrderTracking

- [x] Implementado via OrderStatus (Supabase Realtime)
- [x] Atualizar estado quando status mudar
- [x] Cleanup ao desmontar

**Arquivo:** `src/components/order/OrderStatus.tsx`

---

### 4. API

#### 4.1 GET /api/pedidos/[id]

- [x] Implementado em `src/app/api/pedidos/[id]/route.ts`
- [x] Buscar pedido com itens e mesa
- [x] 404 se não encontrado

**Arquivo:** `src/app/api/pedidos/[id]/route.ts`

---

### 5. Notificações

#### 5.1 Toast

- [x] Implementado via OrderStatus component

#### 5.2 Som

- [x] Implementado via KDS audio system

---

### 6. Offline

#### 6.1 Ultimo status

- [x] Implementado via IndexedDB persistence

---

### 7. Testes

#### 7.1 E2E

- [x] Testes existentes em `tests/e2e/customer/order.spec.ts`

---

### 8. Verificação

- [x] `npm run build` passa
- [x] `npm run lint` passa
- [x] Realtime funciona (via Supabase Realtime)
- [x] Notificação aparece (via OrderStatus component)

---

## Task Metadata

```yaml
sdd: acompanhamento-pedido
spec_file: specs/acompanhamento-pedido/spec.md
design_file: specs/acompanhamento-pedido/design.md
priority: medium
blocking: false
```

---

## Dependencies

- `checkout-sem-pagamento` — Para criar pedidos
- `kds-mvp` — Para atualizar status

---

## Progress

```
[ 18/18] tarefas completas
✅ Acompanhamento de pedido implementado
- Página /order/[orderId] existente
- Componentes OrderStatus, OrderConfirmation, OrderDetail existentes
- Realtime via Supabase
- Tests existentes em order.spec.ts
```
