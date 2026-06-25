# Tasks — `pagamento`

---

## [x] Fase 0 — Baseline (concluído)

- [x] Integração Mercado Pago (PIX).
- [x] Idempotência via `WebhookEvent`.
- [x] Modo demo.
- [x] Reembolso (RF-PAY-08).

---

## [ ] Fase 1 — Fechar ciclo de reembolso

- [ ] `RF-PAY-09` — Webhook de status de reembolso → atualiza `Pagamento.status`.
- [ ] Atualizar `RF-ORDER-12` em [`../pedido/design.md`](../../pedido/design.md) quando `RF-PAY-09` for entregue.

---

## [ ] Fase 2 — Migração DDD da api

- [ ] Migrar `apps/api/src/payments/` → `apps/api/src/domain/pagamento/`.
- [ ] Migrar `apps/api/src/subscriptions/` (apenas o que é de pagamento, não de admin) → `apps/api/src/domain/pagamento/`.

---

## [ ] Fase 3 — Roadmap

- [ ] `RF-PAY-10` — Cartão de crédito (backlog).
