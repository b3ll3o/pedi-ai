# Tasks: Simplificação para Meio de Pagamento Único (MercadoPago PIX)

## Phase 1: Remover Presentation Layer (API Routes)
- [x] 1.1 Deletar `src/app/api/payments/stripe/create-intent/route.ts`
- [x] 1.2 Deletar `src/app/api/payments/stripe/webhook/route.ts`
- [x] 1.3 Deletar `src/app/api/webhooks/stripe/route.ts`
- [x] 1.4 Verificar se existem outras rotas Stripe e deletar

## Phase 2: Remover Presentation Layer (Components)
- [x] 2.1 Atualizar `src/components/checkout/PaymentMethodSelector.tsx` — remover seleção de cartão, deixar só PIX
- [x] 2.2 Atualizar `src/components/checkout/CheckoutForm.tsx` — remover lógica de CardForm e Stripe
- [x] 2.3 Buscar por outros componentes que referenciam Stripe e remover/adaptar

## Phase 3: Remover Application Layer
- [x] 3.1 Deletar `src/application/pagamento/services/CriarStripePaymentIntentUseCase.ts`
- [x] 3.2 Deletar `src/application/pagamento/services/adapters/IStripeAdapter.ts`
- [x] 3.3 Verificar se `CriarStripePaymentIntentUseCase` é importado em algum lugar e remover

## Phase 4: Remover Infrastructure Layer
- [x] 4.1 Deletar `src/infrastructure/external/StripeAdapter.ts`
- [x] 4.2 Verificar se existem outros arquivos em `src/infrastructure/external/` relacionados a Stripe

## Phase 5: Atualizar Domain Layer
- [x] 5.1 Atualizar `src/domain/pagamento/value-objects/MetodoPagamento.ts` — remover `credito` e `debito`, manter só `pix`
- [x] 5.2 Atualizar `src/domain/pedido/value-objects/MetodoPagamento.ts` — mesmo ajuste

## Phase 6: Atualizar Spec
- [x] 6.1 Atualizar `openspec/specs/payment/spec.md`:
  - Remover cenário "Credit Card Payment Flow"
  - Remover cenário "Credit Card Payment Success"
  - Remover cenário "Credit Card Payment Failure"
  - Atualizar "Select Payment Method" para mencionar apenas PIX
  - Atualizar DDD specs: remover Scenario: StripeAdapter Exists
- [x] 6.2 Atualizar DDD implantacao-ddd (se incluir Stripe) — verificado, não havia referências

## Phase 7: Remover Testes
- [x] 7.1 Deletar `tests/unit/infrastructure/payment/StripePaymentAdapter.test.ts`
- [x] 7.2 Deletar `tests/unit/application/payment/CriarStripePaymentIntentUseCase.test.ts`
- [x] 7.3 Deletar `tests/e2e/tests/payment/stripe.spec.ts`
- [x] 7.4 Deletar `tests/e2e/tests/payment/webhook.spec.ts` (Stripe-focused)
- [x] 7.5 Deletar `tests/mocks/StripePaymentAdapter.mock.ts`
- [x] 7.6 Verificar `tests/mocks/` por outros arquivos Stripe e deletar

## Phase 8: Verificação
- [x] 8.1 Executar `pnpm build` — build completa com sucesso
- [x] 8.2 Executar `pnpm lint` — 1 warning (não relacionado)
- [x] 8.3 Executar `pnpm test:unit` — 1 falha pre-existente (landing-metadata)
- [x] 8.4 Buscar por qualquer referência restante a "stripe" ou "Stripe" no código (grep) — limpo

## Phase 9: Commit
- [x] 9.1 Criar commit com todas as mudanças
- [x] 9.2 Push para branch

---

**Commit**: `54d33a1` — feat: remover Stripe e manter apenas MercadoPago PIX
