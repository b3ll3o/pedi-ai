# Tasks: Checkout Sem Pagamento

## Specs

- [x] `openspec/changes/mvp-multica/specs/checkout-sem-pagamento/spec.md` — RFC 2119 spec
- [x] `openspec/changes/mvp-multica/specs/checkout-sem-pagamento/design.md` — Arquitetura e arquivos

---

## Implementação

### 1. Backend — Ajustar FSM de Pedido

#### 1.1 Modificar PedidoAggregate

- [x] Ajustar transições de status (remover `pending_payment`)
- [x] Status inicial = `recebido`
- [x] Manter transições: `recebido` → `preparando` → `pronto` → `entregue`
- [x] Permitir `cancelado` de qualquer estado exceto `entregue`

**Arquivo:** `src/domain/pedido/aggregates/PedidoAggregate.ts`
**Status:** ✅ Completado por agente (PED-14)

#### 1.2 Criar Pedido via API

- [x] `POST /api/pedidos` cria pedido com status `recebido`
- [x] Validar: `restaurantId`, `mesaId`, `itens` não vazios
- [x] Persistir em IndexedDB (offline-first)
- [x] Retornar `{ id, status, createdAt }`

**Arquivo:** `src/app/api/pedidos/route.ts`
**Status:** ✅ Completado por agente (PED-15)

#### 1.3 Remover dependência de pagamento no pedido

- [x] Remover campo `pagamentoId` do Pedido (MVP não tem)
- [x] Remover método `definirPagamento()` se existir
- [x] Remover evento `PagamentoConfirmado` do fluxo (não existe mais)

**Status:** ✅ Completado por agente (PED-16)

---

### 2. Frontend — Checkout Page

#### 2.1 Simplificar checkout page

- [x] Remover `PaymentSelector` component
- [x] Remover estado `paymentMethod`
- [x] Remover lógica condicional para PIX/Card
- [x] Botão: "Enviar Pedido" (não mais "Finalizar Pedido")

**Arquivo:** `src/app/(customer)/checkout/page.tsx`
**Status:** ✅ Completado por agente (PED-17)

#### 2.2 Novo fluxo de submit

- [ ] `handleSubmit()` → `submitOrder()`
- [ ] Chamar API `/api/pedidos` (POST)
- [ ] Se sucesso: redirecionar para `/pedido/{id}`
- [ ] Se erro: mostrar toast de erro

**Arquivo:** `src/app/(customer)/checkout/page.tsx`
**Status:** ⏳ Em progresso (PED-18)

#### 2.3 Atualizar cartStore

- [ ] Adicionar método `submitOrder(restaurantId, mesaId)`
- [ ] Método faz POST para `/api/pedidos`
- [ ] Após sucesso: limpar carrinho (`items = []`)
- [ ] Persistir em IndexedDB

**Arquivo:** `src/stores/cartStore.ts`
**Status:** ⏳ Em progresso (PED-19)

---

### 3. Limpeza de Código

#### 3.1 Deletar componentes de pagamento

- [x] Componentes não existem no projeto (já verificado)
- [x] `src/components/payment/` deletado

**Status:** ✅ Completado por agente (PED-20)

#### 3.2 Atualizar imports

- [x] Imports já verificados - sem referências pendentes

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

**Status:** ⏳ Em progresso (PED-21)

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

**Status:** ⏳ Em progresso (PED-22)

---

### 5. Verificação

- [x] `pnpm build` passa
- [ ] `pnpm lint` passa
- [ ] `pnpm test` passa (todos os testes)
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
[ 10/18] tarefas completas

✅ Backend:
  - 1.1 FSM PedidoAggregate    [COMPLETO]
  - 1.2 API POST /api/pedidos  [COMPLETO]
  - 1.3 Remover pagamento      [COMPLETO]

⏳ Frontend:
  - 2.1 Checkout simplificado   [COMPLETO]
  - 2.2 Fluxo submit          [EM PROGRESSO - PED-18]
  - 2.3 cartStore             [EM PROGRESSO - PED-19]

✅ Limpeza:
  - 3.1 Deletar componentes    [COMPLETO]
  - 3.2 Atualizar imports     [COMPLETO]

⏳ Testes:
  - 4.1 Unitários             [EM PROGRESSO - PED-21]
  - 4.2 E2E                   [EM PROGRESSO - PED-22]

⏳ Verificação:
  - Build                     [COMPLETO ✅]
  - Lint                     [PENDENTE]
  - Tests                    [PENDENTE]
  - Coverage                 [PENDENTE]
```

**Última atualização:** 2026-05-12 03:35 UTC
**Orquestrador:** @orchestrator (eu)
