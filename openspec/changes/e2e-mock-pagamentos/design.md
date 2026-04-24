# Design: E2E Tests com Mock de Pagamentos

## Technical Approach

Implementar mocking de pagamentos para testes E2E através de:
1. **Feature flag `NEXT_PUBLIC_DEMO_PAYMENT_MODE`** para isolar código de produção
2. **Interceptação de rotas API via Playwright `page.route()`** para mocks determinísticos
3. **data-testids** nos componentes de checkout para seleção confiável de elementos

## Architecture Decisions

### Decision: Feature Flag Approach para Demo Mode

**Choice**: Usar variável de ambiente `NEXT_PUBLIC_DEMO_PAYMENT_MODE` para controlar se chamadas reais ou mockadas são feitas.

**Alternatives considered**:
- Mockar apenas no client com `window.fetch` override (demo-mode.ts atual): falha quando API routes chamam serviços externos
- Feature flag só no servidor: não funciona para código client-side

**Rationale**: O Stripe/MercadoPago client é chamado tanto no client quanto no servidor. A variável de ambiente `NEXT_PUBLIC_*` é acessível em ambos contextos, permitindo que API routes também usem a mesma flag.

### Decision: Playwright Route Interception para E2E

**Choice**: Usar `page.route()` em `global-setup.ts` para interceptar todas as chamadas `/api/stripe/*` e `/api/payments/*`.

**Alternatives considered**:
- Modificar `globalSetup` para injetar script via `addInitScript`: mais complexo de manter
- Mockar no nível do fetch client: requer alterações no código da aplicação

**Rationale**: `page.route()` é o método padrão do Playwright para mocking de rede. Pode ser configurado uma vez no globalSetup e afeta todas as páginas do contexto.

### Decision: data-testid Naming Convention

**Choice**: `checkout-email`, `checkout-table-number`, `payment-method-pix`, `payment-method-card`.

**Alternatives considered**:
- Reusar nomes existentes como `customer-email-input`: diverge do spec
- Nomes genéricos como `input-1`, `input-2`: difícil de manter

**Rationale**: O spec define os data-testids explicitamente. Segui-los garante compliance com os cenários de teste.

## Data Flow

```
Teste E2E executa
       ↓
global-setup.ts aplica mocks via page.route()
       ↓
App faz chamada /api/payments/pix/create
       ↓
Playwright intercepta e retorna mock determinístico
       ↓
App exibe QR code mockado
       ↓
Teste verifica elementos via data-testid
```

**Fluxo Demo Mode (alternativo)**:
```
App inicia com NEXT_PUBLIC_DEMO_PAYMENT_MODE=true
       ↓
API route detecta flag e retorna dados mockados
       ↓
Não há chamada externa real
```

## File Changes

### Novos arquivos

| Arquivo | Descrição |
|---------|-----------|
| `tests/e2e/support/mock-payment.ts` | Já existe - handlers de interceptação de rotas |
| `.env.e2e` | Arquivo de ambiente com `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true` |

### Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/components/checkout/PaymentMethodSelector.tsx` | Adicionar `data-testid="payment-method-pix"` e `data-testid="payment-method-card"` nos botões |
| `src/components/checkout/CheckoutForm.tsx` | Adicionar inputs de email e table-number com data-testids conforme spec |
| `tests/e2e/playwright.config.ts` | Usar `global-setup-demo.ts` para E2E, não `global-setup.ts` |
| `tests/e2e/global-setup-demo.ts` | Já existe - aplicar mocks de payment via `mockPaymentHandlers()` |
| `tests/e2e/pages/CheckoutPage.ts` | Atualizar locators para usar os novos data-testids |
| `src/app/(customer)/checkout/CheckoutForm.tsx` | Adicionar data-testids ao form e verificar se precisa de email/table inputs |

### Arquivos não existem (a criar se necessário)

| Arquivo | Razão |
|---------|-------|
| `src/lib/stripe/client.ts` | Não existe - Stripe não está integrado ainda |

## Interfaces / Contracts

### Mock Payment Response

```typescript
// GET /api/payments/pix/create (mockado)
interface PixPaymentResponse {
  qr_code: string;        // BR Code format
  qr_code_base64: string; // Base64 PNG
  expires_at: string;     // ISO timestamp
}

// GET /api/payments/stripe/create-intent (mockado)
interface PaymentIntentResponse {
  clientSecret: string;   // prefixed with "demo_secret_"
}
```

### data-testid Attributes

```tsx
// Email input
<input data-testid="checkout-email" />

// Table number input
<input data-testid="checkout-table-number" />

// Submit button
<button data-testid="checkout-submit">

// PIX option
<button data-testid="payment-method-pix">

// Credit Card option
<button data-testid="payment-method-card">

// QR Code display
<div data-testid="pix-qr-code">

// Card form display
<div data-testid="card-form">
```

## Testing Strategy

1. **global-setup-demo.ts** registra `mockPaymentHandlers` para todas as páginas
2. **mock-payment.ts** intercepta rotas:
   - `/api/stripe/*` → mock deterministic response
   - `/api/payments/*` → mock deterministic response
   - `/api/orders/*/status` → retorna `confirmed` após delay simulado
3. **Tests usam data-testids** para interação com elementos
4. **Demo mode flag** é setado via `.env.e2e` quando necessário

## Migration / Rollout

1. Adicionar data-testids aos componentes de checkout
2. Atualizar `mock-payment.ts` com interceptação completa
3. Modificar `playwright.config.ts` para usar global-setup-demo para testes de payment/checkout
4. Executar suite de testes para validar
5. Mock não afetará produção (só ativa via `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true`)

## Open Questions

1. **PIX QR code base64**: O spec não define se deve ser imagem real ou placeholder. Manter como dado mockado simples.
2. **Confirmação automática**: O spec menciona "simular confirmação após 2 segundos" - implementar via `setTimeout` no mock handler.
3. **Card form**: O CheckoutForm atual não tem card form rendering. Tests que verificam `credit-card-form` podem falhar até implementação real.
