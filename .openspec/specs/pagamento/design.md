# Design — `pagamento`

---

## 1. Visão Geral

```
[Cliente] ─→ CriarPixChargeUseCase ─→ PixAdapter ─→ Mercado Pago API
                                                       ↓
                                              [QR Code PIX + txid]
                                                       ↓
                                       (cliente paga no app do banco)
                                                       ↓
[MP Webhook] ─→ ProcessarWebhookUseCase ─→ validar assinatura + idempotência
                                                       ↓
                                           Pagamento.status = APROVADO
                                                       ↓
                                           Pedido.status = CONFIRMADO
                                                       ↓
                                                Socket.io → cozinha
```

---

## 2. Requisitos Funcionais (RF-PAY)

| ID          | Descrição                               | Materialização (código)                    | Status       |
| ----------- | --------------------------------------- | ------------------------------------------ | ------------ |
| `RF-PAY-01` | Criar cobrança PIX                      | `CriarPixChargeUseCase.ts`                 | ✅ Done      |
| `RF-PAY-02` | Processar webhook                       | `ProcessarWebhookUseCase.ts`               | ✅ Done      |
| `RF-PAY-03` | Validar assinatura webhook              | `PixAdapter.validarAssinatura()`           | ✅ Done      |
| `RF-PAY-04` | Listar pagamentos do pedido (planejado) | `ListarPagamentosUseCase.ts` (a confirmar) | 🟡 Planejado |
| `RF-PAY-05` | Atualizar status                        | `AtualizarStatusPagamentoUseCase.ts`       | ✅ Done      |
| `RF-PAY-06` | Modo demo                               | `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true`       | ✅ Done      |
| `RF-PAY-07` | Idempotência (WebhookEvent)             | `apps/api/prisma/schema.prisma`            | ✅ Done      |
| `RF-PAY-08` | Iniciar reembolso                       | `IniciarReembolsoUseCase.ts`               | ✅ Done      |

---

## 3. Regras de Negócio

- **Idempotência**: cada webhook é registrado em `WebhookEvent` com `idempotencyKey` (MP envia `data.id`). Reentregas **MUST NOT** processar 2x.
- **Validação de assinatura**: HMAC SHA256 do body com `MP_WEBHOOK_SECRET`. Falha de validação **MUST** retornar 401.
- **Modo demo**: quando `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true`, `PixAdapter` retorna QR fake; webhook simulado por endpoint admin.

---

## 4. `RF-PAY-08` — Reembolso

### Fluxo

```
1. `CancelarPedidoUseCase` (BC `pedido`) verifica que pedido está pago.
2. Chama `IniciarReembolsoUseCase` com `pagamentoId` e `valor` (parcial ou total).
3. `PixAdapter.solicitarReembolso()` chama `POST /v1/payments/{id}/refunds` no MP.
4. Status do pagamento vira `REEMBOLSADO` (ou `REEMBOLSADO_PARCIAL`).
5. Webhook confirma (futuro: reentrega de status).
```

### Gap conhecido

- **Webhook de confirmação de reembolso** ainda não aciona atualização de status (subdependência de `RF-PAY-09`, a definir).

---

## 5. Decisões de Design

- **Por que adapter separado (`PixAdapter`)?** — Permite trocar Mercado Pago por outro PSP sem mudar use cases.
- **Por que `WebhookEvent` no Prisma?** — Idempotência precisa de persistência transacional (DB, não cache).
- **Por que modo demo?** — Acelera desenvolvimento local; configurável por env var.

---

## 6. Próximos Requisitos

| ID          | Descrição                                  | Quarter alvo |
| ----------- | ------------------------------------------ | ------------ |
| `RF-PAY-09` | Webhook de status de reembolso (planejado) | Q3/2026      |
| `RF-PAY-10` | Múltiplos meios (cartão, planejado)        | Backlog      |

---

## 7. RTM (trecho)

A RTM completa é regenerada por `pnpm rtm`.

| Status     | RFs                            |
| ---------- | ------------------------------ |
| ✅ Done    | 01, 02, 03, 04, 05, 06, 07, 08 |
| 🔴 Missing | —                              |
