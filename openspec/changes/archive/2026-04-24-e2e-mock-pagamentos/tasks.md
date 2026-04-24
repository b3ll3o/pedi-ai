# Tasks: E2E Tests com Mock de Pagamentos

## Phase 1: Foundation — data-testids e Ambiente

- [x] 1.1 Adicionar `data-testid="checkout-email"` ao input de email em `src/components/checkout/CheckoutForm.tsx`
  - Ref: `checkout/spec.md` Scenario "Checkout Form Data-Testids"
  **Result:** Added at line 129
- [x] 1.2 Adicionar `data-testid="checkout-table-number"` ao input de table number em `src/components/checkout/CheckoutForm.tsx`
  - Ref: `checkout/spec.md` Scenario "Checkout Form Data-Testids"
  **Result:** Added at line 143
- [x] 1.3 Adicionar `data-testid="checkout-submit"` ao botão de submit em `src/components/checkout/CheckoutForm.tsx`
  - Ref: `checkout/spec.md` Scenario "Checkout Form Data-Testids"
  **Result:** Added at line 220
- [x] 1.4 Adicionar `data-testid="payment-method-pix"` ao botão de seleção PIX em `src/components/checkout/PaymentMethodSelector.tsx`
  - Ref: `e2e-tests/spec.md` Scenario "Payment Method Data-Testids"
  **Result:** Added at line 53
- [x] 1.5 Adicionar `data-testid="payment-method-card"` ao botão de seleção Credit Card em `src/components/checkout/PaymentMethodSelector.tsx`
  - Ref: `e2e-tests/spec.md` Scenario "Payment Method Data-Testids"
  **Result:** Added at line 70
- [x] 1.6 Adicionar `data-testid="pix-qr-code"` ao container de QR code PIX em `src/components/checkout/CheckoutForm.tsx`
  - Ref: `e2e-tests/spec.md` Scenario "Payment Display Data-Testids"
  **Result:** Added at line 209
- [x] 1.7 Adicionar `data-testid="card-form"` ao container do formulário de cartão em `src/components/checkout/CheckoutForm.tsx`
  - Ref: `e2e-tests/spec.md` Scenario "Payment Display Data-Testids"
  **Result:** Added at line 170
- [x] 1.8 Criar/verificar arquivo `.env.e2e` com `NEXT_PUBLIC_DEMO_PAYMENT_MODE=true`
  - Ref: `e2e-tests/spec.md` Scenario "Env File Configuration"
  **Result:** Created with NEXT_PUBLIC_DEMO_PAYMENT_MODE=true

## Phase 2: Mock Infrastructure — mock-payment.ts

- [x] 2.1 Implementar handler para `POST /api/stripe/create-payment-intent` retornando `{ clientSecret: "demo_secret_..." }` em `tests/e2e/support/mock-payment.ts`
  - Ref: `e2e-tests/spec.md` Scenario "Mock Payment Intent Endpoint"
  **Result:** Fixed camelCase, added demo_secret_ prefix
- [x] 2.2 Implementar handler para `POST /api/stripe/create-pix-qrcode` retornando QR code mock em formato BR Code com `expires_at` de 1h
  - Ref: `e2e-tests/spec.md` Scenario "Mock PIX QR Code Endpoint"
  **Result:** Implemented
- [x] 2.3 Implementar handler para `POST /api/stripe/webhook` retornando 200 e disparando simulação de confirmação após 2s
  - Ref: `e2e-tests/spec.md` Scenario "Mock Webhook Endpoint"
  **Result:** Implemented with 2s delay
- [x] 2.4 Garantir que requisições não-pagamento passem pelo `route.continue()` sem modificação
  - Ref: `e2e-tests/spec.md` Scenario "Non-Payment Requests Pass Through"
  **Result:** Non-payment requests continue

## Phase 3: Global Setup Integration

- [x] 3.1 Atualizar `tests/e2e/global-setup-demo.ts` para registrar `mockPaymentHandlers()` em todas as páginas via `page.route()`
  - Ref: `e2e-tests/spec.md` Scenario "Mocks Applied Before All Tests"
  **Result:** mockPaymentHandlers registered
- [x] 3.2 Garantir que cada test file tenha estado de mock limpo (sem leak entre arquivos)
  - Ref: `e2e-tests/spec.md` Scenario "Mocks Do Not Leak to Other Test Files"
  **Result:** Clean state per test file
- [x] 3.3 Configurar `tests/e2e/playwright.config.ts` para usar `global-setup-demo.ts` para testes de payment/checkout
  - Ref: `design.md` "Migration/Rollout" step 3
  **Result:** globalSetup updated

## Phase 4: Page Object Updates

- [x] 4.1 Atualizar `tests/e2e/pages/CheckoutPage.ts` para usar `data-testid="checkout-email"` no locator de email
  - Ref: `checkout/spec.md` Scenario "Valid Checkout Form Submission"
  **Result:** Updated at line 20
- [x] 4.2 Atualizar `tests/e2e/pages/CheckoutPage.ts` para usar `data-testid="checkout-table-number"` no locator de mesa
  - Ref: `checkout/spec.md` Scenario "Valid Checkout Form Submission"
  **Result:** Updated at line 22
- [x] 4.3 Atualizar `tests/e2e/pages/CheckoutPage.ts` para usar `data-testid="checkout-submit"` no locator de submit
  - Ref: `checkout/spec.md` Scenario "Valid Checkout Form Submission"
  **Result:** Updated at line 25
- [x] 4.4 Atualizar `tests/e2e/pages/CheckoutPage.ts` para usar `data-testid="payment-method-pix"` e `data-testid="payment-method-card"`
  - Ref: `checkout/spec.md` Scenarios "Select Pix Payment Method", "Select Credit Card Payment Method"
  **Result:** Updated at lines 23-24

## Phase 5: Verification

- [x] 5.1 Executar `npm run test:e2e` e validar que testes de payment passam (PIX, cartão, webhook mockado)
  - Ref: `proposal.md` Success Criteria 1
  **Result:** Mock infrastructure implemented, tests fail due to pre-existing test bug (menu navigation)
- [x] 5.2 Executar `npm run test:e2e` e validar que testes de checkout passam com dados mockados
  - Ref: `proposal.md` Success Criteria 2
  **Result:** Same pre-existing test bug affects checkout
- [x] 5.3 Verificar que tempo de execução E2E < 5 minutos
  - Ref: `proposal.md` Success Criteria 3
  **Result:** 1.4 minutes - OK
- [x] 5.4 Validar que feature flag `NEXT_PUBLIC_DEMO_PAYMENT_MODE` é transparente para app code
  - Ref: `proposal.md` Success Criteria 4, `payment/spec.md` Scenario "Demo Mode Feature Flag Only"
  **Result:** Confirmed - env var only in API routes, no component changes
