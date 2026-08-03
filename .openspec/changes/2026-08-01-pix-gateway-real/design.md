# Design — Conectar `PaymentsService` ao `PixGateway` real

## 1. Fluxo novo (vs atual)

### Antes (QUEBRADO)

```
[POST /payments] → PaymentsService.createPixPayment
                  → buildPixStubPayload()        # BR Code inválido
                  → qrserver.com como QR         # apps bancários RECUSAM
                  → PaymentIntent{qrCode: 'https://...pending'}  # nunca atualiza
```

### Depois (CORRETO)

```
[POST /payments] → PaymentsService.createPixPayment
                  → @Inject(PIX_GATEWAY) pixGateway.createPixCharge()
                      ├─ MercadoPagoPixGateway (produção) → POST /v1/payments MP
                      └─ DemoPixGateway        (fallback) → BR Code determinístico
                  → tx.paymentIntent.update({qrCode, qrCodeBase64, mercadoPagoPaymentId})
                  → retorna {id, qrCode, qrCodeBase64, expiresAt, amount}
```

## 2. Mudanças técnicas

### 2.1 `apps/api/src/payments/payments.module.ts`

**Antes** (`payments.module.ts:11-15`):

```ts
@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
```

**Depois**:

```ts
import { pixGatewayProvider } from './infrastructure/pix-gateway.provider';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, pixGatewayProvider],
  exports: [PaymentsService, pixGatewayProvider],
})
```

### 2.2 `apps/api/src/payments/payments.service.ts`

**Remover** (linhas 8-56): função morta `buildPixStubPayload` e o bloco
`/** Gera um payload PIX EMV no formato BR Code (BACEN). ... Stub (auditoria A17) ... */`.
Mantém-se o `@spec(RF-PAY-01)` como comentário da classe `PaymentsService`.

**Modificar** construtor (linha 76):

```ts
// Antes:
constructor(private prisma: PrismaService) {}

// Depois:
constructor(
  private prisma: PrismaService,
  @Inject(PIX_GATEWAY) private readonly pixGateway: PixGateway,
) {}
```

**Modificar** `createPixPayment` (linhas 78-140) — bloco interno da `$transaction`:

```ts
// Antes (linhas 121-126):
const pixPayload = buildPixStubPayload(serverAmount, created.id);
const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pixPayload)}`;
return tx.paymentIntent.update({
  where: { id: created.id },
  data: { qrCode },
});

// Depois:
const charge = await this.pixGateway.createPixCharge({
  orderId: created.id,
  amount: serverAmount,
  description: `Pedido #${created.id.slice(-8)} — Pedi-AI`,
  expirationMs: PIX_INTENT_TTL_MS,
});
return tx.paymentIntent.update({
  where: { id: created.id },
  data: {
    qrCode: charge.qrCode,
    qrCodeBase64: charge.qrCodeBase64 || null,
    mercadoPagoPaymentId: charge.externalId,
  },
});
```

**Atualizar** retorno (linhas 134-139) para incluir `qrCodeBase64`:

```ts
return {
  id: payment.id,
  qrCode: payment.qrCode,
  qrCodeBase64: payment.qrCodeBase64,
  expiresAt: payment.expiresAt,
  amount: payment.amount,
};
```

### 2.3 `apps/api/tests/unit/payments/payments.service.spec.ts` (novo)

Cobre `createPixPayment` com `PixGateway` mockado:

- Quando gateway retorna charge válida → `qrCode`, `qrCodeBase64` e
  `mercadoPagoPaymentId` são persistidos em `PaymentIntent`
- Quando gateway lança erro → `$transaction` faz rollback, `PaymentIntent`
  não persiste
- Tenant check: order de outro restaurante → `ForbiddenException`

### 2.4 OpenSpec baseline — `.openspec/specs/pagamento/design.md`

RF-PAY-01 fica:

```
| `RF-PAY-01` | Criar cobrança PIX | `apps/api/src/payments/payments.service.ts` + `apps/api/src/payments/infrastructure/mercadopago-pix.gateway.ts` | ✅ Done (P0-07 fechado 2026-08-01) |
```

## 3. Decisões de design

- **Por que deletar `buildPixStubPayload`?** — Função morta após a fiação;
  manter seria vetor de regressão (alguém poderia chamar de novo em outro
  service). Cobertura do gateway demo já cobre o caminho de fallback.
- **Por que `payerEmail` não é passado?** — Schema do `Order` não tem email
  do cliente como campo obrigatório. Capturar email seria RF novo — fora do
  escopo deste fix.
- **Por que `$transaction` interno continua igual?** — Falha do gateway
  precisa reverter o INSERT do `PaymentIntent`. Manter dentro da mesma
  transação garante atomicidade (não sobra intent com `qrCode: null`).

## 4. Critérios de aceite

1. `pnpm --filter @pedi-ai/api lint` retorna 0 erros
2. `pnpm --filter @pedi-ai/api test payments.service` passa com ≥85% coverage no arquivo
3. `pnpm test:coverage` no root mantém ≥80% em todas as métricas
4. `grep -r "buildPixStubPayload\|api.qrserver.com" apps/api/src` retorna vazio
5. `git grep "PIX_GATEWAY" apps/api/src/payments/payments.service.ts` retorna ≥1 hit
6. `pnpm rtm` regenera `docs/requirements/RTM.md` sem regressão em RF-PAY-* status

## 5. Métrica de sucesso (pós-merge)

- **Failed PIX rate** cai de **100%** (stub) para **<0.5%** (NSM alvo) na
  primeira semana em produção com `MERCADOPAGO_ACCESS_TOKEN` configurado.
- **NSM** "Pedidos concluídos via PIX" deixa de ser 0 em produção.
