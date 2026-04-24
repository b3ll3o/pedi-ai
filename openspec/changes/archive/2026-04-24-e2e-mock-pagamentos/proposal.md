# Proposal: E2E Tests com Mock de Integrações Externas

## Intent

Eliminar dependência de serviços externos (Stripe PIX, Stripe Credit Card, webhooks) nos testes E2E através de mocking inteligente, permitindo que todos os testes passem localmente sem acesso à internet.

## Problema

### Dependências Externas Identificadas

| Serviço | Uso | Status Atual |
|---------|-----|--------------|
| Stripe API | PIX QR code, pagamento cartão | ❌ Não implementado |
| Stripe Webhooks | Confirmação de pagamento | ❌ Não implementado |
| Supabase | Auth, banco de dados | ✅ Funcionando localmente |
| Internet | CSS fonts, CDNs | ⚠️ Bloqueado por network isolation nos testes |

### Testes Afetados

1. **Payment (6 testes)**
   - `should process PIX payment` - precisa QR code PIX real
   - `should wait for PIX payment confirmation` - precisa webhook
   - `should display payment error for failed transaction` - precisa Stripe Elements
   - `should handle payment timeout` - precisa webhook timeout

2. **Checkout (7 testes)**
   - `should submit order with valid data` - redireciona para order confirmation
   - `should accept PIX payment method` - mostra info PIX
   - `should accept credit card payment method` - mostra formulário cartão

3. **Order (8 testes)**
   - `should update status in real-time` - precisa Realtime subscription
   - `should allow order cancellation` - depende de status real

## Abordagem: Mock de Pagamento Local

### Estratégia 1: Interceptação de API (Recomendado)

Interceptar chamadas à API de pagamento no nível do Next.js API routes:

```
# API Routes a serem mockadas:
/api/stripe/create-payment-intent → mock response
/api/stripe/create-pix-qrcode → mock QR code data
/api/stripe/webhook → mock success after delay
/api/orders/[id]/status → local state
```

### Implementação

Criar mock handlers em `tests/e2e/support/mock-payment.ts`:

```typescript
// Mock de Stripe PIX
export function mockStripePIX(page: Page) {
  page.route('**/api/stripe/**', async (route) => {
    const url = route.request().url()

    if (url.includes('create-pix-qrcode')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          qr_code: '00020101021226880014br.gov.bcb.pix2565pix.here.co...',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      })
      return
    }

    if (url.includes('webhook')) {
      // Simula confirmação automática após 2s
      setTimeout(() => {
        // Dispatch event para Update order status
      }, 2000)
      await route.fulfill({ status: 200, body: 'ok' })
      return
    }

    await route.continue()
  })
}
```

### Estratégia 2: Feature Flags para Modo Demo

Adicionar feature flag `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true` que:

1. Desabilita chamada real ao Stripe
2. Retorna dados mockados instantâneos
3. Simula delay de 1-2s para feedback visual

```typescript
// src/lib/stripe/client.ts
export async function createPaymentIntent(amount: number) {
  if (process.env.NEXT_PUBLIC_DEMO_PAYMENT_MODE === 'true') {
    return {
      data: {
        clientSecret: 'demo_secret_' + Math.random().toString(36),
        qrCode: generateMockPIXQRCode(),
      },
      error: null,
    }
  }
  // Real Stripe call
}
```

## Scope

### In Scope
- Mock de Stripe API (PIX, cartão)
- Mock de webhook (confirmação automática)
- Feature flag `NEXT_PUBLIC_DEMO_PAYMENT_MODE`
- Atualização dos page objects para usar dados mockados

### Out of Scope
- Implementação real de Stripe
- Testes de integração Stripe em produção
- Mock de Realtime subscriptions (pode usar polling como fallback)

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `tests/e2e/support/mock-payment.ts` | Novo - mock handlers |
| `tests/e2e/support/setup.ts` | Aplicar mocks antes dos testes |
| `tests/e2e/pages/CheckoutPage.ts` | Adicionar data-testid |
| `src/components/checkout/CheckoutForm.tsx` | Adicionar data-testid |
| `src/app/(customer)/checkout/CheckoutClient.tsx` | Adicionar email/table inputs |
| `.env.e2e` | Adicionar `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true` |

## Riscos

1. **Mock diverge do real** - dados mockados podem não refletir comportamento real
2. **Testes passam mock mas falham produção** - mitigado por testes de контраactual integration
3. **Manutenção dupla** - manter mocks e código real sincronizados

## Rollback Plan

- Remover feature flag e mock handlers
- Tests voltam a falhar sem integração real
- Manter testes de контраactual integration separately

## Success Criteria

1. E2E payment tests passam sem Stripe credentials
2. E2E checkout tests passam com dados mockados
3. Tempo de execução E2E < 5 minutos
4. Mock é transparente para app code (feature flag only)

## Timeline Proposto

1. **Fase 1**: Adicionar data-testid aos componentes de checkout
2. **Fase 2**: Criar mock-payment.ts com handlers
3. **Fase 3**: Configurar globalSetup para aplicar mocks
4. **Fase 4**: Executar testes e ajustar
5. **Fase 5**: Validar suite completo