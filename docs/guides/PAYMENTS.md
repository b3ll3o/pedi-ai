# Guia de Fluxos de Pagamento — Pedi-AI

Este documento descreve a arquitetura e os fluxos de pagamento implementados no Pedi-AI, incluindo PIX via Mercado Pago, Cartão via Stripe, e o modo de demonstração.

---

## 1. Visão Geral

O Pedi-AI suporta dois provedores de pagamento para processar transações de clientes:

| Provedor         | Método   | Caso de Uso                                      | Status          |
| ---------------- | -------- | ------------------------------------------------ | --------------- |
| **Mercado Pago** | PIX      | Pagamentos instantâneos, sem custo de transação  | ✅ Implementado |
| **Demo Mode**    | Simulado | Testes sem custo real (bypassa provedores reais) | ✅ Implementado |

> **Nota:** Pagamento com cartão de crédito/débito (Stripe) não está implementado. O projeto suporta apenas PIX via Mercado Pago.

### Variáveis de Ambiente

```bash
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=    # Token de acesso do Mercado Pago
NEXT_PUBLIC_DEMO_PAYMENT_MODE=true       # Bypassa pagamentos reais (demo/simulado)
```

---

## 2. PIX (Mercado Pago)

### 2.1 Fluxo Completo

```
┌─────────────┐    POST /api/payments/pix/create    ┌─────────────────────┐
│   Cliente    │ ───────────────────────────────────▶  │  PIX Create Route   │
│  (Checkout)  │                                     │  (route.ts)         │
└─────────────┘                                      └──────────┬──────────┘
                                                                   │
                                                    Mercado Pago API
                                                                    │
                                                                   ▼
┌─────────────┐    QR Code + QR Base64                 ┌─────────────────────┐
│   Cliente    │ ◀────────────────────────────────────  │  Payment Created    │
│  (Checkout)  │                                        │  (PixCharge)        │
└─────────────┘                                        └─────────────────────┘
                                                                   │
                                                                   ▼
                                                         ┌─────────────────────┐
                                                         │ payment_intents     │
                                                         │ (Supabase DB)       │
                                                         └─────────────────────┘
                                                                   │
                                                                   ▼
┌─────────────┐    Webhook Notification           ┌─────────────────────────────────────┐
│   Mercado   │ ─────────────────────────────────▶  │  supabase/functions/pix-webhook   │
│   Pago      │                                     │  (Edge Function - Deno)            │
└─────────────┘                                     └──────────────────┬──────────────────┘
                                                                    │
                                                        Validação X-Signature
                                                                    │
                                                                    ▼
                                                        ┌─────────────────────────────────────┐
                                                        │ Idempotency Check (webhook_events)  │
                                                        └──────────────────┬──────────────────┘
                                                                            │
                                                    Fetch payment details from MP API
                                                                            │
                                                                           ▼
                                                        ┌─────────────────────────────────────┐
                                                        │ Update orders.status = 'paid'       │
                                                        └─────────────────────────────────────┘
```

### 2.2 Criação do PIX — `POST /api/payments/pix/create`

**Endpoint:** `/api/payments/pix/create`

**Request Body:**

```json
{
  "order_id": "ord_123abc"
}
```

**Fluxo:**

1. Valida se `order_id` está presente
2. Busca pedido no banco via Supabase
3. Verifica se pedido já não está pago (`payment_status === 'paid'`)
4. Cria pagamento PIX via `MercadoPagoConfig` + `Payment`
5. Armazena `payment_intent` na tabela `payment_intents` com status `pending`
6. Atualiza pedido com `payment_method: 'pix'`
7. Retorna QR code e data de expiração

**Response:**

```json
{
  "qr_code": "00020101021226880014br.gov.bcb.pix2565...",
  "qr_code_base64": "data:image/png;base64,...",
  "expires_at": "2026-04-28T15:30:00.000Z"
}
```

**Expiração:** PIX do Mercado Pago expira em **30 minutos**.

### 2.3 Validação de Webhook — Mercado Pago

O webhook do Mercado Pago está implementado em `supabase/functions/pix-webhook/index.ts`.

**Validação de Assinatura (HMAC-SHA256):**

```typescript
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';

async function validateSignature(req: Request, payload: { id: string }): Promise<boolean> {
  const signature = req.headers.get('X-Signature');
  if (!signature || !MP_WEBHOOK_SECRET) {
    return false;
  }

  const bodyStr = JSON.stringify(payload);
  const dataToSign = `${payload.id}.${bodyStr}`;

  const hmac = createHmac('sha256', MP_WEBHOOK_SECRET);
  hmac.update(dataToSign);
  const expectedSignature = `sha256=${hmac.digest('base64')}`;

  // Constant-time comparison (timingSafeEqual)
  const sigBuffer = new TextEncoder().encode(signature);
  const expectedBuffer = new TextEncoder().encode(expectedSignature);
  return timingSafeEqual(sigBuffer, expectedBuffer);
}
```

### 2.4 Tratamento de Idempotência

Antes de processar o webhook, verifica-se se o evento já foi tratado:

```typescript
const { data: existingEvent } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('id', eventId)
  .single();

if (existingEvent) {
  return Response.json({ status: 'duplicate' }, { status: 200 });
}
```

Após processar com sucesso, o evento é registrado:

```typescript
await supabase.from('webhook_events').insert({ id: eventId, event_type: type });
```

### 2.5 Mapeamento de Status

```typescript
const statusMap: Record<string, string> = {
  approved: 'paid',
  pending: 'pending_payment',
  processing: 'processing',
  rejected: 'payment_failed',
  cancelled: 'payment_failed',
  refunded: 'refunded',
};
```

---

## 3. Modo Demo (Pagamentos Simulados)

Quando `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true`, todos os pagamentos são simulados sem interação com provedores reais.

### 4.1 PIX Demo

```typescript
// POST /api/payments/pix/create
if (isDemoMode) {
  return NextResponse.json({
    qr_code: `00020101021226880014br.gov.bcb.pix2565demo.here.co/v2/demo${random}`,
    qr_code_base64: `data:image/png;base64,${Buffer.from(mockQrCode).toString('base64')}`,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  });
}
```

### 4.2 Status PIX Demo

```typescript
// GET /api/payments/pix/status/[orderId]
if (isDemoMode) {
  return NextResponse.json({
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  });
}
```

### 4.3 Webhook Demo

```typescript
// POST /api/webhooks/stripe/webhook
if (isDemoMode) {
  return NextResponse.json({ received: true, demo: true });
}
```

---

## 4. Segurança de Webhooks

### 5.1 Validação de Assinatura — PIX (Mercado Pago)

| Aspecto             | Implementação                           |
| ------------------- | --------------------------------------- |
| **Algoritmo**       | HMAC-SHA256                             |
| **Header**          | `X-Signature`                           |
| **Formato**         | `sha256=base64(hmac)`                   |
| **Dados assinados** | `webhook_id.body`                       |
| **Proteção**        | `timingSafeEqual` contra timing attacks |

### 5.2 Validação de Assinatura — Stripe

| Aspecto       | Implementação                      |
| ------------- | ---------------------------------- |
| **Algoritmo** | HMAC-SHA256 (via SDK)              |
| **Header**    | `stripe-signature`                 |
| **Método**    | `Stripe.webhooks.constructEvent()` |
| **Proteção**  | SDK interno do Stripe              |

### 5.3 Idempotência

Todos os webhooks verificam se o evento já foi processadon antes de aplicar qualquer alteração:

- **Stripe:** Via `transacaoRepo.buscarPorProviderId(eventoId)` → `Transacao`
- **PIX:** Via `webhook_events` table → idempotency key

---

## 5. Status do Pedido

### 6.1 Status de Pagamento (Domain)

```typescript
type StatusPagamentoValue = 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled';
```

| Status      | Descrição            | Transições válidas                   |
| ----------- | -------------------- | ------------------------------------ |
| `pending`   | Aguardando pagamento | → `confirmed`, `failed`, `cancelled` |
| `confirmed` | Pagamento confirmado | → `refunded`                         |
| `failed`    | Pagamento recusado   | (final)                              |
| `refunded`  | Reembolsado          | (final)                              |
| `cancelled` | Cancelado            | (final)                              |

### 6.2 Status no Pedido (Orders)

| Status Pagamento | Status Pedido     |
| ---------------- | ----------------- |
| `pending`        | `pending_payment` |
| `confirmed`      | `paid`            |
| `failed`         | `payment_failed`  |
| `refunded`       | `refunded`        |
| `cancelled`      | `cancelled`       |

### 6.3 Máquina de Estados — PagamentoAggregate

```
                    ┌───────────────────────────────────────────────────────┐
                    │                                                       │
                    ▼                                                       │
┌─────────────┐    criar()    ┌─────────────┐    processarSucessoTransacao    ┌─────────────┐
│   (new)     │ ───────────▶  │  PENDING   │ ──────────────────────────────▶  │  CONFIRMED  │
└─────────────┘               └─────────────┘                                  └─────────────┘
                                   │                                                  │
                                   │ processarFalhaTransacao                           │ reembolsar()
                                   ▼                                                  ▼
                            ┌─────────────┐                                    ┌─────────────┐
                            │   FAILED   │                                    │  REFUNDED   │
                            └─────────────┘                                    └─────────────┘
                                   │                                                  ▲
                                   │ cancelarPagamento()                               │
                                   ▼                                                  │
                            ┌─────────────┐                                           │
                            │ CANCELLED  │ ────────────────────────────────────────────┘
                            └─────────────┘
```

---

## 6. Tratamento de Erros

### 6.1 Erros Comuns — PIX

| Erro                                   | Causa                                | Tratamento            |
| -------------------------------------- | ------------------------------------ | --------------------- |
| `Order not found`                      | Pedido não existe no banco           | HTTP 404              |
| `Order is already paid`                | Tentativa de pagar pedido já quitado | HTTP 400              |
| `Failed to generate Pix QR code`       | Falha na API do Mercado Pago         | HTTP 500              |
| `Missing order_id in payment metadata` | Metadata não enviada no create       | Log + erro no webhook |

### 6.2 Erros de Validação — Domain

| Erro                                                                    | Condição                                     |
| ----------------------------------------------------------------------- | -------------------------------------------- |
| `Não é possível adicionar transação de charge a pagamento não pendente` | Aggregate em estado final                    |
| `Apenas pagamentos confirmados podem receber reembolso`                 | Tentativa de reembolso indevida              |
| `Valor de reembolso não pode exceder o valor do pagamento`              | Reembolso maior que valor                    |
| `Pagamento já não está pendente`                                        | Confirmação/falha de pagamento já processado |

### 6.3 Códigos de Resposta HTTP

| Código | Uso                                 |
| ------ | ----------------------------------- |
| 200    | Sucesso (inclusive idempotência)    |
| 400    | Erro de validação, payload inválido |
| 401    | Assinatura de webhook inválida      |
| 404    | Recurso não encontrado              |
| 405    | Método HTTP não permitido           |
| 500    | Erro interno do servidor            |

---

## 7. Flags de Feature

### 8.1 Funções Disponíveis

```typescript
// src/lib/feature-flags.ts

/** Enable PIX as a payment method */
export function isPixEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED === 'true';
}

/** Enable Stripe as a payment method */
export function isStripeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_STRIPE_ENABLED === 'true';
}
```

### 8.2 Uso no Frontend

```typescript
import { isPixEnabled, isStripeEnabled } from '@/lib/feature-flags'

// Exibir opção PIX no checkout
{isPixEnabled() && <PixPaymentOption />}

// Exibir opção cartão no checkout
{isStripeEnabled() && <CardPaymentOption />}
```

### 8.3 Todas as Flags

| Flag                                    | Descrição                       |
| --------------------------------------- | ------------------------------- |
| `NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED`   | Modo offline com service worker |
| `NEXT_PUBLIC_FEATURE_PIX_ENABLED`       | PIX como método de pagamento    |
| `NEXT_PUBLIC_FEATURE_STRIPE_ENABLED`    | Stripe como método de pagamento |
| `NEXT_PUBLIC_FEATURE_WAITER_MODE`       | Chamado de garçom               |
| `NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED`   | Leitura de QR codes             |
| `NEXT_PUBLIC_FEATURE_COMBOS_ENABLED`    | Combos/promotions               |
| `NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED` | Dashboard analytics             |
| `NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED`  | Sistema de cashback             |
| `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT`   | Suporte multi-restaurante       |

---

## 8. Estrutura de Arquivos

```
apps/web/src/
├── domain/pagamento/
│   ├── entities/
│   │   ├── Pagamento.ts          # Entidade de pagamento
│   │   └── Transacao.ts          # Transação (charge, refund, webhook)
│   ├── value-objects/
│   │   ├── MetodoPagamento.ts    # pix (único método disponível)
│   │   └── StatusPagamento.ts    # pending | confirmed | failed | refunded | cancelled
│   ├── aggregates/
│   │   └── PagamentoAggregate.ts # Aggregate root com invariantes
│   ├── events/
│   │   ├── PagamentoConfirmadoEvent.ts
│   │   ├── PagamentoFalhouEvent.ts
│   │   ├── ReembolsoIniciadoEvent.ts
│   │   └── ReembolsoConfirmadoEvent.ts
│   └── repositories/
│       ├── IPagamentoRepository.ts
│       └── ITransacaoRepository.ts
│
├── application/pagamento/services/
│   ├── ProcessarWebhookUseCase.ts     # Processa webhooks PIX
│   ├── CriarPixChargeUseCase.ts
│   ├── IniciarReembolsoUseCase.ts
│   └── adapters/
│       └── IPixAdapter.ts
│
├── infrastructure/
│   ├── external/
│   │   └── PixAdapter.ts        # Implementação Mercado Pago (stub - ver nota)
│   └── persistence/pagamento/
│       ├── PagamentoRepository.ts
│       └── TransacaoRepository.ts
│
├── app/api/payments/
│   ├── pix/
│   │   ├── create/route.ts              # POST - Criar PIX
│   │   └── status/[orderId]/route.ts    # GET - Status PIX
│
└── supabase/functions/
    └── pix-webhook/
        └── index.ts                     # Edge function para webhooks MP
```

> **Nota:** `PixAdapter.ts` é um stub que retorna dados simulados. A integração real com Mercado Pago está em `src/app/api/payments/pix/create/route.ts`.

---

## 9. Testes

### 9.1 Testes Unitários

```bash
# Tests de domínio
npm run test -- tests/unit/domain/pagamento/

# Tests de adapters
npm run test -- tests/unit/infrastructure/payment/

# Tests de use cases
npm run test -- tests/unit/application/payment/
```

### 9.2 Testes de Integração

```bash
# PIX API
npm run test -- tests/integration/api/payments.test.ts
```

### 9.3 Testes E2E

```bash
# Fluxo completo de pagamento PIX
npx playwright test tests/e2e/tests/payment/pix.spec.ts
```

### 9.4 Setup Local — Mercado Pago

Para testar PIX em desenvolvimento, configure o token do Mercado Pago:

```bash
MERCADO_PAGO_ACCESS_TOKEN=APP_TEST-xxxxx
NEXT_PUBLIC_DEMO_PAYMENT_MODE=false
```

Ou use o modo demo (`NEXT_PUBLIC_DEMO_PAYMENT_MODE=true`) para testar sem provedores reais.

---

## 10. Variáveis de Ambiente Resumidas

```bash
# === PRODUÇÃO ===

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_TEST-xxxxx

# === DESENVOLVIMENTO ===
NEXT_PUBLIC_DEMO_PAYMENT_MODE=true       # Modo demo (pagamentos simulados)
```
