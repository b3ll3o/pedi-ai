# Tasks — `pedido`

---

## [x] Fase 0 — Baseline (concluído)

- [x] Carrinho completo (CRUD + offline).
- [x] FSM com transições validadas.
- [x] Histórico + detalhe.
- [x] Realtime (Socket.io).
- [x] Sincronização offline.
- [x] Reordenação.

---

## [ ] Fase 1 — `RF-ORDER-12` ponta-a-ponta (próximo)

- [ ] Criar E2E `customer/cancel-with-refund.spec.ts` cobrindo: pedido pago → cancelamento → reembolso iniciado → webhook confirma.
- [ ] Adicionar substatus `REEMBOLSADO` em `StatusPedido`.
- [ ] Endpoint admin `POST /orders/:id/force-cancel` (com auditoria).

---

## [ ] Fase 2 — Migração DDD da api

- [ ] Migrar `apps/api/src/orders/` → `apps/api/src/domain/pedido/`.

---

## [ ] Fase 3 — Recursos avançados

- [ ] `RF-ORDER-13` — Web Push API (Q4/2026).
- [ ] `RF-ORDER-14` — Pedidos agendados (Q1/2027).
