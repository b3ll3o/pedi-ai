# Design — `pedido`

---

## 1. Visão Geral

```
[Cliente] ─→ CarrinhoAggregate (Dexie)
                  │
                  │ fecharPedido
                  ▼
            CriarPedidoFromInputUseCase
                  │
                  ├→ PedidoRepository (Postgres)
                  ├→ PagamentoUseCase (cria charge PIX)
                  └→ Socket.io (notifica cozinha)
```

---

## 2. Requisitos Funcionais (RF-ORDER)

| ID            | Descrição                           | Materialização (código)                                | Status       |
| ------------- | ----------------------------------- | ------------------------------------------------------ | ------------ |
| `RF-ORDER-01` | Adicionar item ao carrinho          | `AdicionarItemCarrinhoUseCase.ts`                      | ✅ Done      |
| `RF-ORDER-02` | Remover item do carrinho            | `RemoverItemCarrinhoUseCase.ts`                        | ✅ Done      |
| `RF-ORDER-03` | Editar quantidade                   | `AtualizarQuantidadeUseCase.ts`                        | ✅ Done      |
| `RF-ORDER-04` | Limpar carrinho                     | `LimparCarrinhoUseCase.ts`                             | ✅ Done      |
| `RF-ORDER-05` | Criar pedido a partir do carrinho   | `CriarPedidoFromInputUseCase.ts`                       | ✅ Done      |
| `RF-ORDER-06` | Atualizar status (FSM)              | `AtualizarStatusPedidoUseCase.ts`                      | ✅ Done      |
| `RF-ORDER-07` | Histórico do cliente                | `ListarHistoricoClienteUseCase.ts`                     | ✅ Done      |
| `RF-ORDER-08` | Detalhe do pedido (planejado)       | `ObterPedidoUseCase.ts`                                | 🟡 Planejado |
| `RF-ORDER-09` | Notificar status (realtime)         | `Socket.io` + `apps/api/src/realtime/`                 | ✅ Done      |
| `RF-ORDER-10` | Sincronização offline               | `lib/sync.ts` + `BackgroundSync`                       | ✅ Done      |
| `RF-ORDER-11` | Reordenar (de histórico, planejado) | `ReordenarUseCase.ts`                                  | 🟡 Planejado |
| `RF-ORDER-12` | Cancelar com reembolso (planejado)  | `CancelarPedidoUseCase.ts` + `IniciarReembolsoUseCase` | 🟡 Planejado |

---

## 3. `RF-ORDER-12` — Cancelamento com Reembolso (detalhamento)

### Fluxo

```
1. Cliente solicita cancelamento de pedido P (status ∈ {PENDENTE, CONFIRMADO}).
2. Sistema valida: pedido existe, pertence ao cliente, está em estado cancelável.
3. Se pedido tem pagamento APROVADO:
   a. Chamar `IniciarReembolsoUseCase` (BC `pagamento`).
   b. Marcar pedido como `CANCELADO` com `reembolsoId`.
4. Se pedido NÃO tem pagamento aprovado:
   a. Marcar pedido como `CANCELADO` diretamente.
5. Notificar cozinha via Socket.io (cancelamento).
6. Cliente recebe confirmação + ID de reembolso (se aplicável).
```

### Pré-condições

- Pedido existe e pertence ao cliente solicitante.
- Status ∈ {`PENDENTE`, `CONFIRMADO`, `PREPARANDO`}. Após `PRONTO`, cancelamento **MUST NOT** ser permitido via app (apenas via admin).

### Pós-condições

- Pedido transiciona para `CANCELADO`.
- Se pago, reembolso é iniciado (assíncrono; webhook confirma depois).

### Materialização (código atual)

- `apps/web/src/application/pedido/services/CancelarPedidoUseCase.ts` (a criar/confirmar)
- `apps/web/src/application/pagamento/services/IniciarReembolsoUseCase.ts` (`@spec(RF-PAY-08)`)
- `apps/api/src/orders/orders.controller.ts` (endpoint legado `POST /orders/:id/cancel`)

### Gap conhecido

- **Cancelamento ponta-a-ponta não tem teste E2E dedicado** — apenas testes unitários dos use cases isolados.
- **Webhook de confirmação de reembolso** ainda não aciona atualização do status para `REEMBOLSADO` (subestado a definir).

### Tarefa pendente

- [ ] Criar `RF-ORDER-12` ponta-a-ponta: E2E `customer/cancel-with-refund.spec.ts` cobrindo cenário "pago + cancelado".
- [ ] Criar substatus `REEMBOLSADO` ou `REEMBOLSO_PENDENTE` em `StatusPedido`.

---

## 4. Decisões de Design

- **Por que carrinho em Dexie e não no servidor?** — UX offline-first; cliente monta sem rede.
- **Por que FSM explícita?** — Bug clássico: transição inválida (`PRONTO → PENDENTE`) impossível.
- **Por que socket.io?** — Reconexão automática; fallback polling já implementado.

---

## 5. Próximos Requisitos

| ID            | Descrição                                     | Quarter alvo |
| ------------- | --------------------------------------------- | ------------ |
| `RF-ORDER-13` | Notificações push (Web Push API)              | Q4/2026      |
| `RF-ORDER-14` | Pedido agendado (data/hora futura, planejado) | Q1/2027      |

---

## 6. RTM (trecho)

A RTM completa é regenerada por `pnpm rtm`.

| Status     | RFs                                        |
| ---------- | ------------------------------------------ |
| ✅ Done    | 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11 |
| 🟡 Partial | 12 (falta E2E ponta-a-ponta)               |
