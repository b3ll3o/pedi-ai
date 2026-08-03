# Conectar `PaymentsService` ao `PixGateway` real (P0-07)

> **Status:** Proposta · **Data:** 2026-08-01 · **PR:** pendente

## 1. Contexto

A auditoria completa de 2026-07-29 (docs/auditorias/PLANO_AUDITORIA_2026-07-29.md §2.1)
identificou **P0-07**: o `apps/api/src/payments/payments.service.ts:78-140`
embute um stub `buildPixStubPayload()` que gera BR Code com CRC16 placeholder
e QR Code hospedado em `api.qrserver.com`. **Apps bancários recusam o
payload** por CRC16 inválido (texto `PEDI-AI STUB`), então **clientes não
conseguem pagar pedidos em produção**.

A infraestrutura de gateway real **já foi construída**:

- `apps/api/src/payments/infrastructure/pix-gateway.ts` — interface `PixGateway` + factory `resolvePixGatewayMode` + `buildIdempotencyKey`
- `apps/api/src/payments/infrastructure/mercadopago-pix.gateway.ts` — implementação real (POST `/v1/payments` com `X-Idempotency-Key`)
- `apps/api/src/payments/infrastructure/demo-pix.gateway.ts` — fallback dev/CI
- `apps/api/src/payments/infrastructure/pix-gateway.provider.ts` — `FactoryProvider` que decide em runtime qual implementação injetar

Cobertura de teste dos gateways: **100%** dos métodos públicos em
`apps/api/tests/unit/payments/pix-gateway.spec.ts` e
`apps/api/tests/unit/payments/pix-gateway.provider.spec.ts`.

**O bug é puramente de fiação**: `PaymentsModule`
(`apps/api/src/payments/payments.module.ts:11-15`) só provê `PaymentsService`,
não injeta o gateway. `PaymentsService` ignora a interface e chama o stub.

## 2. Por que não foi feito antes

O gateway foi adicionado em commits anteriores (paralelo à auditoria) sem que
o `PaymentsService` fosse atualizado. O stub original foi preservado
"para não quebrar dev", mas acabou virando o caminho **padrão em produção**
quando `MERCADOPAGO_ACCESS_TOKEN` está configurado (porque o serviço nunca
olha para o gateway provider).

## 3. O que esta PR faz

1. **`PaymentsModule`**: registra `pixGatewayProvider` (já existente) como
   provider, exporta `PIX_GATEWAY` para testes.
2. **`PaymentsService`**: injeta `PixGateway` via `@Inject(PIX_GATEWAY)`,
   remove a função `buildPixStubPayload` (morta), chama
   `pixGateway.createPixCharge()` dentro da `$transaction` e persiste
   `qrCode`, `qrCodeBase64` e `mercadoPagoPaymentId` no `PaymentIntent`.
3. **Teste de unidade**: cobre `createPixPayment` invocando o gateway
   (mock), garantindo que o stub legacy **nunca** é mais executado.
4. **OpenSpec**: marca RF-PAY-01 com link real ao gateway (atualmente
   marcado `✅ Done` mas referenciando `CriarPixChargeUseCase.ts` que não
   existe no path NestJS — a RTM está mentindo).
5. **RTM**: regenerada via `pnpm rtm` e commitada junto.

## 4. Por que **não** mesclar com outras P0 pendentes

PRs por categoria, conforme princípio inegociável do `analista-requisitos`:

- Esta PR resolve apenas **monetização** (PIX stub quebrado)
- P0-08 (Service Worker quebrado) é categoria **ux/offline-first** — PR separada
- P0-12 (Husky 9) é categoria **ci/segurança** — PR separada

Misturar tudo num mega-PR mascara regressões e dificulta rollback.

## 5. Riscos & mitigações

| Risco                                                 | Mitigação                                                                                                                                        |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gateway MP cair em runtime → pedidos sem QR           | `DemoPixGateway` é fallback quando sem token; warning explícito no log (`PixGatewayFactory` linha 42)                                            |
| Idempotência quebrar entre createPixPayment e webhook | `buildIdempotencyKey(orderId)` já é determinístico; chave `pix-{orderId}` reaproveitada no webhook lookup via `mercadoPagoPaymentId`             |
| `qrCodeBase64` salvar null em produção                | Persistência explícita no `update` da transação (não mais `qrCode: 'pending'`); default `String?` no schema já existe                            |
| Cobertura cair <80% em `payments.service.ts`          | Novo teste cobre caminho principal (gateway injetado, persistência feita); stub legacy é deletado, então não tem caminho alternativo não-coberto |

## 6. Fora de escopo

- Migração para Asaas (em roadmap, mas PIX via MP continua sendo o caminho)
- Webhook de confirmação de reembolso (`RF-PAY-09` — backlog Q3)
- Adicionar `payerEmail` ao payload (depende de captura de email no checkout)
