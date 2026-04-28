# Guia de Fluxos de Pagamento — Pedi-AI

Este documento descreve a arquitetura e os fluxos de pagamento implementados no Pedi-AI, incluindo PIX via Mercado Pago, Cartão via Stripe, e o modo de demonstração.

---

## 1. Visão Geral

O Pedi-AI suporta dois provedores de pagamento para processar transações de clientes:

| Provedor | Método | Caso de Uso | Status |
|----------|--------|-------------|--------|
| **Mercado Pago** | PIX | Pagamentos instantâneos, sem custo de transação | ✅ Implementado |
| **Stripe** | Cartão de Crédito/Débito | Pagamentos com cartão, maior abrangência | 🟡 Parcial |
| **Demo Mode** | Simulado | Testes sem custo real | ✅ Implementado |

### Variáveis de Ambiente

```bash
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=    # Token de acesso do Mercado Pago
MP_ACCESS_TOKEN=               # Alias para MERCADO_PAGO_ACCESS_TOKEN
MP_WEBHOOK_SECRET=             # Secret para validar webhooks do Mercado Pago

# Stripe
STRIPE_SECRET_KEY=             # Chave secreta do Stripe
STRIPE_WEBHOOK_SECRET=         # Webhook secret para validar assinaturas

# Feature Flags (client-side)
NEXT_PUBLIC_FEATURE_PIX_ENABLED=true     # Habilita PIX no checkout
NEXT_PUBLIC_FEATURE_STRIPE_ENABLED=true  # Habilita Stripe no checkout
NEXT_PUBLIC_DEMO_PAYMENT_MODE=true       # Bypassa pagamentos reais
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
const MP_WEBHOOK_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? ''

async function validateSignature(req: Request, payload: { id: string }): Promise<boolean> {
  const signature = req.headers.get('X-Signature')
  if (!signature || !MP_WEBHOOK_SECRET) {
    return false
  }

  const bodyStr = JSON.stringify(payload)
  const dataToSign = `${payload.id}.${bodyStr}`

  const hmac = createHmac('sha256', MP_WEBHOOK_SECRET)
  hmac.update(dataToSign)
  const expectedSignature = `sha256=${hmac.digest('base64')}`

  // Constant-time comparison (timingSafeEqual)
  const sigBuffer = new TextEncoder().encode(signature)
  const expectedBuffer = new TextEncoder().encode(expectedSignature)
  return timingSafeEqual(sigBuffer, expectedBuffer)
}
```

### 2.4 Tratamento de Idempotência

Antes de processar o webhook, verifica-se se o evento já foi tratado:

```typescript
const { data: existingEvent } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('id', eventId)
  .single()

if (existingEvent) {
  return Response.json({ status: 'duplicate' }, { status: 200 })
}
```

Após processar com sucesso, o evento é registrado:

```typescript
await supabase
  .from('webhook_events')
  .insert({ id: eventId, event_type: type })
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
}
```

---

## 3. Stripe (Cartão de Crédito/Débito)

### 3.1 Fluxo Completo

```
┌─────────────┐   POST /api/payments/stripe/create-intent   ┌─────────────────────────┐
│   Cliente    │ ─────────────────────────────────────────▶  │  Stripe Create Intent   │
│  (Checkout)  │                                            │  (route.ts)              │
└─────────────┘                                            └────────────┬──────────────┘
                                                                              │
                                                                  Stripe API
                                                                           │
                                                                          ▼
┌─────────────┐   clientSecret                      ┌─────────────────────────┐
│   Cliente    │ ◀─────────────────────────────────  │  PaymentIntent Created  │
│  (Checkout)  │                                     │  (StripeAdapter)        │
└─────────────┘                                     └─────────────────────────┘
                                                                           │
                                              Stripe Elements (Frontend)
                                                                           │
                                                                          ▼
┌─────────────┐   Confirm Payment                  ┌─────────────────────────┐
│   Cliente    │ ─────────────────────────────────▶  │  stripe.confirmPayment  │
│  (Stripe.js) │                                     │  (Client-side)          │
└─────────────┘                                     └────────────┬────────────┘
                                                                              │
                                                            Webhook POST
                                                             │
                                                             ▼
┌─────────────┐                                        ┌─────────────────────────┐
│   Stripe     │ ───────────────────────────────────▶  │  POST /api/webhooks/    │
│   Server     │                                        │  stripe/webhook         │
└─────────────┘                                        └────────────┬────────────┘
                                                                          │
                                                          Stripe.webhooks
                                                          .constructEvent()
                                                                          │
                                                                          ▼
                                                        ┌─────────────────────────┐
                                                        │ ProcessarWebhookUseCase │
                                                        │ (Application Layer)      │
                                                        └────────────┬────────────┘
                                                                              │
                                                               Domain Events
                                                               (PagamentoConfirmadoEvent)
                                                                              │
                                                                             ▼
                                                        ┌─────────────────────────┐
                                                        │ PagamentoAggregate      │
                                                        │ confirmarPagamento()    │
                                                        └─────────────────────────┘
```

### 3.2 Criação do PaymentIntent — `POST /api/payments/stripe/create-intent`

**Endpoint:** `/api/payments/stripe/create-intent`

**Request Body:**
```json
{
  "order_id": "ord_123abc"
}
```

**Fluxo:**
1. Valida se `order_id` está presente
2. Busca pedido no banco via Supabase
3. Cria `PaymentIntent` via `StripeAdapter.criarPaymentIntent()`
4. Retorna `clientSecret` para o frontend

**Response:**
```json
{
  "clientSecret": "pi_ord_123abc_secret_abc123"
}
```

**Adapter (StripeAdapter):**
```typescript
async criarPaymentIntent(valorEmCentavos: number, pedidoId: string): Promise<StripePaymentIntent> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: valorEmCentavos,
    currency: 'brl',
    metadata: { order_id: pedidoId },
  })
  return {
    id: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    valor: paymentIntent.amount,
    status: paymentIntent.status,
  }
}
```

### 3.3 Webhook Stripe — `POST /api/webhooks/stripe/webhook`

**Endpoint:** `/api/webhooks/stripe/webhook`

**Headers required:**
```
stripe-signature: t=1714300000,v1=abc123,v0=def456
```

**Eventos processados:**
- `payment_intent.succeeded` → Confirma pagamento
- `payment_intent.payment_failed` → Registra falha

**Validação de Assinatura:**

```typescript
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

try {
  const event = Stripe.webhooks.constructEvent(body, signature, webhookSecret)
} catch (err) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
}
```

O SDK do Stripe valida a assinatura automaticamente via `constructEvent()`.

### 3.4 Processamento de Webhook — `ProcessarWebhookUseCase`

O use case está em `src/application/pagamento/services/ProcessarWebhookUseCase.ts`.

**Idempotência:**
```typescript
const transacaoExistente = await this.transacaoRepo.buscarPorProviderId(eventoId)
if (transacaoExistente) {
  return { sucesso: true, mensagem: 'Evento já processado anteriormente', eventoId }
}
```

**Processamento de `payment_intent.succeeded`:**
```typescript
// 1. Adicionar transação webhook ao aggregate
aggregate.adicionarTransacaoWebhook(eventoId, payload)

// 2. Processar sucesso da transação de charge
const transacaoCharge = aggregate.transacoes.find(t => t.providerId === paymentIntentId)
if (transacaoCharge) {
  aggregate.processarSucessoTransacao(transacaoCharge.id)
}

// 3. Salvar alterações
await this.pagamentoRepo.salvar(aggregate.pagamento)

// 4. Disparar eventos de domínio
const eventos = aggregate.getEventos()
eventos.forEach(evento => this.eventDispatcher.dispatch(evento))
```

---

## 4. Modo Demo (Pagamentos Simulados)

Quando `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true`, todos os pagamentos são simulados sem interação com provedores reais.

### 4.1 PIX Demo

```typescript
// POST /api/payments/pix/create
if (isDemoMode) {
  return NextResponse.json({
    qr_code: `00020101021226880014br.gov.bcb.pix2565demo.here.co/v2/demo${random}`,
    qr_code_base64: `data:image/png;base64,${Buffer.from(mockQrCode).toString('base64')}`,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  })
}
```

### 4.2 Status PIX Demo

```typescript
// GET /api/payments/pix/status/[orderId]
if (isDemoMode) {
  return NextResponse.json({
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  })
}
```

### 4.3 Webhook Demo

```typescript
// POST /api/webhooks/stripe/webhook
if (isDemoMode) {
  return NextResponse.json({ received: true, demo: true })
}
```

---

## 5. Segurança de Webhooks

### 5.1 Validação de Assinatura — PIX (Mercado Pago)

| Aspecto | Implementação |
|---------|---------------|
| **Algoritmo** | HMAC-SHA256 |
| **Header** | `X-Signature` |
| **Formato** | `sha256=base64(hmac)` |
| **Dados assinados** | `webhook_id.body` |
| **Proteção** | `timingSafeEqual` contra timing attacks |

### 5.2 Validação de Assinatura — Stripe

| Aspecto | Implementação |
|---------|---------------|
| **Algoritmo** | HMAC-SHA256 (via SDK) |
| **Header** | `stripe-signature` |
| **Método** | `Stripe.webhooks.constructEvent()` |
| **Proteção** | SDK interno do Stripe |

### 5.3 Idempotência

Todos os webhooks verificam se o evento já foi processadon antes de aplicar qualquer alteração:

- **Stripe:** Via `transacaoRepo.buscarPorProviderId(eventoId)` → `Transacao`
- **PIX:** Via `webhook_events` table → idempotency key

---

## 6. Status do Pedido

### 6.1 Status de Pagamento (Domain)

```typescript
type StatusPagamentoValue = 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled'
```

| Status | Descrição | Transições válidas |
|--------|-----------|-------------------|
| `pending` | Aguardando pagamento | → `confirmed`, `failed`, `cancelled` |
| `confirmed` | Pagamento confirmado | → `refunded` |
| `failed` | Pagamento recusado | (final) |
| `refunded` | Reembolsado | (final) |
| `cancelled` | Cancelado | (final) |

### 6.2 Status no Pedido (Orders)

| Status Pagamento | Status Pedido |
|------------------|--------------|
| `pending` | `pending_payment` |
| `confirmed` | `paid` |
| `failed` | `payment_failed` |
| `refunded` | `refunded` |
| `cancelled` | `cancelled` |

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

## 7. Tratamento de Erros

### 7.1 Erros Comuns — PIX

| Erro | Causa | Tratamento |
|------|-------|------------|
| `Order not found` | Pedido não existe no banco | HTTP 404 |
| `Order is already paid` | Tentativa de pagar pedido já quitado | HTTP 400 |
| `Failed to generate Pix QR code` | Falha na API do Mercado Pago | HTTP 500 |
| `Missing order_id in payment metadata` | Metadata não enviada no create | Log + erro no webhook |

### 7.2 Erros Comuns — Stripe

| Erro | Causa | Tratamento |
|------|-------|------------|
| `Missing stripe-signature header` | Header ausente | HTTP 400 |
| `Invalid signature` | Assinatura inválida | HTTP 400 |
| `PaymentIntent ID não encontrado` | Payload malformado | HTTP 400 |
| `Pagamento não encontrado para PaymentIntent` | Transação sem correspondência | HTTP 400 |

### 7.3 Erros de Validação — Domain

| Erro | Condição |
|------|----------|
| `Não é possível adicionar transação de charge a pagamento não pendente` | Aggregate em estado final |
| `Apenas pagamentos confirmados podem receber reembolso` | Tentativa de reembolso indevida |
| `Valor de reembolso não pode exceder o valor do pagamento` | Reembolso maior que valor |
| `Pagamento já não está pendente` | Confirmação/falha de pagamento já processado |

### 7.4 Códigos de Resposta HTTP

| Código | Uso |
|--------|-----|
| 200 | Sucesso (inclusive idempotência) |
| 400 | Erro de validação, payload inválido |
| 401 | Assinatura de webhook inválida |
| 404 | Recurso não encontrado |
| 405 | Método HTTP não permitido |
| 500 | Erro interno do servidor |

---

## 8. Flags de Feature

### 8.1 Funções Disponíveis

```typescript
// src/lib/feature-flags.ts

/** Enable PIX as a payment method */
export function isPixEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_PIX_ENABLED === 'true'
}

/** Enable Stripe as a payment method */
export function isStripeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_FEATURE_STRIPE_ENABLED === 'true'
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

| Flag | Descrição |
|------|-----------|
| `NEXT_PUBLIC_FEATURE_OFFLINE_ENABLED` | Modo offline com service worker |
| `NEXT_PUBLIC_FEATURE_PIX_ENABLED` | PIX como método de pagamento |
| `NEXT_PUBLIC_FEATURE_STRIPE_ENABLED` | Stripe como método de pagamento |
| `NEXT_PUBLIC_FEATURE_WAITER_MODE` | Chamado de garçom |
| `NEXT_PUBLIC_FEATURE_QR_CODE_ENABLED` | Leitura de QR codes |
| `NEXT_PUBLIC_FEATURE_COMBOS_ENABLED` | Combos/promotions |
| `NEXT_PUBLIC_FEATURE_ANALYTICS_ENABLED` | Dashboard analytics |
| `NEXT_PUBLIC_FEATURE_CASHBACK_ENABLED` | Sistema de cashback |
| `NEXT_PUBLIC_ENABLE_MULTI_RESTAURANT` | Suporte multi-restaurante |

---

## 9. Estrutura de Arquivos

```
src/
├── domain/pagamento/
│   ├── entities/
│   │   ├── Pagamento.ts          # Entidade de pagamento
│   │   └── Transacao.ts          # Transação (charge, refund, webhook)
│   ├── value-objects/
│   │   ├── MetodoPagamento.ts    # pix | credito | debito
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
│   ├── ProcessarWebhookUseCase.ts     # Processa webhooks de ambos provedores
│   ├── CriarStripePaymentIntentUseCase.ts
│   ├── CriarPixChargeUseCase.ts
│   ├── IniciarReembolsoUseCase.ts
│   └── adapters/
│       ├── IStripeAdapter.ts
│       └── IPixAdapter.ts
│
├── infrastructure/
│   ├── external/
│   │   ├── StripeAdapter.ts     # Implementação Stripe
│   │   └── PixAdapter.ts        # Implementação Mercado Pago
│   └── persistence/pagamento/
│       ├── PagamentoRepository.ts
│       └── TransacaoRepository.ts
│
├── app/api/payments/
│   ├── pix/
│   │   ├── create/route.ts              # POST - Criar PIX
│   │   └── status/[orderId]/route.ts    # GET - Status PIX
│   └── stripe/
│       ├── create-intent/route.ts       # POST - Criar PaymentIntent
│       └── webhook/route.ts             # POST - Webhook Stripe
│
└── supabase/functions/
    └── pix-webhook/
        └── index.ts                     # Edge function para webhooks MP
```

---

## 10. Testes

### 10.1 Testes Unitários

```bash
# Tests de domínio
npm run test -- src/tests/unit/domain/pagamento/

# Tests de adapters
npm run test -- src/tests/unit/infrastructure/payment/

# Tests de use cases
npm run test -- src/tests/unit/application/payment/
```

### 10.2 Testes de Integração

```bash
# Webhooks
npm run test -- tests/integration/api/webhooks.test.ts

# Payments API
npm run test -- src/tests/integration/api/payments.test.ts
```

### 10.3 Testes E2E

```bash
# Fluxo completo de pagamento Stripe
npx playwright test tests/e2e/tests/payment/stripe.spec.ts

# Webhooks
npx playwright test tests/e2e/tests/payment/webhook.spec.ts
```

### 10.4 Setup Local — Stripe CLI

Consulte `docs/STRIPE_CLI_SETUP.md` para configurar o reenvio de webhooks em desenvolvimento local.

---

## 11. Variáveis de Ambiente Resumidas

```bash
# === PRODUÇÃO ===

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_TEST-xxxxx
MP_ACCESS_TOKEN=APP_TEST-xxxxx
MP_WEBHOOK_SECRET=your_webhook_secret

# Stripe
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# === DESENVOLVIMENTO ===
NEXT_PUBLIC_FEATURE_PIX_ENABLED=true
NEXT_PUBLIC_FEATURE_STRIPE_ENABLED=true
NEXT_PUBLIC_DEMO_PAYMENT_MODE=true
```
