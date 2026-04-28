# Tasks: Simplificação para Meio de Pagamento Único (MercadoPago PIX)

## Phase 1: Remover Presentation Layer (API Routes)
- [ ] 1.1 Deletar `src/app/api/payments/stripe/create-intent/route.ts`
- [ ] 1.2 Deletar `src/app/api/payments/stripe/webhook/route.ts`
- [ ] 1.3 Deletar `src/app/api/webhooks/stripe/route.ts`
- [ ] 1.4 Deletar `supabase/functions/stripe-webhook/` (se existir)
- [ ] 1.5 Verificar se existem outras rotas Stripe e deletar

## Phase 2: Remover Presentation Layer (Components)
- [ ] 2.1 Atualizar `src/components/checkout/PaymentMethodSelector.tsx` — remover seleção de cartão, deixar só PIX
- [ ] 2.2 Atualizar `src/components/checkout/CheckoutForm.tsx` — remover lógica de CardForm e Stripe
- [ ] 2.3 Buscar por outros componentes que referenciam Stripe e remover/adaptar

## Phase 3: Remover Application Layer
- [ ] 3.1 Deletar `src/application/pagamento/services/CriarStripePaymentIntentUseCase.ts`
- [ ] 3.2 Deletar `src/application/pagamento/services/adapters/IStripeAdapter.ts`
- [ ] 3.3 Verificar se `CriarStripePaymentIntentUseCase` é importado em algum lugar e remover

## Phase 4: Remover Infrastructure Layer
- [ ] 4.1 Deletar `src/infrastructure/external/StripeAdapter.ts`
- [ ] 4.2 Deletar `src/infrastructure/external/StripeWebhookValidator.ts` (se existir)
- [ ] 4.3 Verificar se existem outros arquivos em `src/infrastructure/external/` relacionados a Stripe

## Phase 5: Atualizar Domain Layer
- [ ] 5.1 Atualizar `src/domain/pagamento/value-objects/MetodoPagamento.ts` — remover `credito` e `debito`, manter só `pix`
- [ ] 5.2 Atualizar `src/domain/pagamento/entities/Pagamento.ts` — remover referências a métodos Stripe (se houver)

## Phase 6: Atualizar Spec
- [ ] 6.1 Atualizar `openspec/specs/payment/spec.md`:
  - Remover cenário "Credit Card Payment Flow"
  - Remover cenário "Credit Card Payment Success"
  - Remover cenário "Credit Card Payment Failure"
  - Atualizar "Select Payment Method" para mencionar apenas PIX
  - Atualizar DDD specs: remover Scenario: StripeAdapter Exists
- [ ] 6.2 Atualizar DDD implantacao-ddd (se incluir Stripe) — remover referências

## Phase 7: Remover Testes
- [ ] 7.1 Deletar `tests/unit/infrastructure/payment/StripePaymentAdapter.test.ts`
- [ ] 7.2 Deletar `tests/unit/application/payment/CriarStripePaymentIntentUseCase.test.ts`
- [ ] 7.3 Deletar `tests/e2e/tests/payment/stripe.spec.ts`
- [ ] 7.4 Deletar `tests/e2e/tests/payment/webhook.spec.ts` (se só tiver Stripe) ou adaptar
- [ ] 7.5 Deletar `tests/mocks/stripe.mock.ts` (se existir)
- [ ] 7.6 Verificar `tests/mocks/` por outros arquivos Stripe e deletar

## Phase 8: Verificação
- [ ] 8.1 Executar `pnpm build` — garantir que build completa sem erros
- [ ] 8.2 Executar `pnpm lint` — garantir que não há imports órfãos de Stripe
- [ ] 8.3 Executar `pnpm test:unit` — garantir que testes passam
- [ ] 8.4 Buscar por qualquer referência restante a "stripe" ou "Stripe" no código (grep)
- [ ] 8.5 Verificar checkout manualmente (se possível)

## Phase 9: Commit
- [ ] 9.1 Criar commit com todas as mudanças
- [ ] 9.2 Push para branch
