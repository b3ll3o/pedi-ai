# Spec — Bounded Context `pagamento`

> **Status:** Baseline aprovado · **Última atualização:** 2026-06-25 · **Owner:** Time Pagamento

---

## 1. Contexto

O BC `pagamento` processa **PIX** via Mercado Pago (modo real) ou modo demo
(para desenvolvimento). Ele é o **gate** entre o pedido e a cozinha: o
status `CONFIRMADO` do pedido só é atingido após `Pagamento = APROVADO`.

---

## 2. Por que existe

- O Brasil é dominado por PIX; o Pedi-AI precisa aceitar PIX nativamente.
- Webhooks precisam ser **idempotentes** (Mercado Pago pode entregar 2x).
- Cancelamentos disparam **reembolso** via API de refunds do Mercado Pago.
- Modo **demo** permite desenvolver sem credenciais reais.

---

## 3. Quem usa

| Persona | Necessidade                                          |
| ------- | ---------------------------------------------------- |
| Cliente | Pagar via PIX (QR copied + cola); ver status.        |
| Owner   | Ver pagamentos recebidos; configurar credenciais MP. |
| Sistema | Receber webhook de pagamento; reconciliar status.    |

---

## 4. Escopo (RF cobertos)

Veja [design.md](./design.md).

- `RF-PAY-01` Criar cobrança PIX (QR code).
- `RF-PAY-02` Processar webhook de pagamento (idempotente).
- `RF-PAY-03` Validar assinatura do webhook.
- `RF-PAY-04` Listar pagamentos do pedido.
- `RF-PAY-05` Atualizar status de pagamento.
- `RF-PAY-06` Modo demo (sem credenciais reais).
- `RF-PAY-07` Persistir `WebhookEvent` para idempotência.
- `RF-PAY-08` Iniciar reembolso.

---

## 5. Fora de Escopo

- **Múltiplos meios de pagamento** (cartão de crédito, débito) — fora de roadmap 2026.
- **Split de pagamento** (marketplace) — backlog.
- **CASHBACK** — flag existe mas **sem RF**; ver [design.md de `admin`](../admin/design.md).

---

## 6. Referências

- `docs/guides/PAYMENTS.md`
- `apps/web/src/domain/pagamento/`
- `apps/api/src/payments/` (legado)
- `apps/api/prisma/schema.prisma` (model `WebhookEvent`)
