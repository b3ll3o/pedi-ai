# Proposal: Simplificação para Meio de Pagamento Único (MercadoPago PIX)

## Intent

Remover Stripe como meio de pagamento e manter apenas MercadoPago PIX. A aplicação será inicializada com um único gateway de pagamento para simplificar a operação, reduzir complexidade técnica e custos de integração.

## Scope

### In Scope
- Remover StripeAdapter e todas as referências a Stripe
- Remover método de pagamento `credito` e `debito` do `MetodoPagamento`
- Remover `CriarStripePaymentIntentUseCase`
- Remover rotas API `/api/payments/stripe/` e `/api/webhooks/stripe`
- Atualizar `PaymentMethodSelector` para exibir apenas PIX
- Atualizar `CheckoutForm` para remover seleção de cartão
- Atualizar spec de pagamento para refletir PIX como única opção
- Atualizar testes unitários de Stripe (remover)
- Atualizar testes E2E de pagamento Stripe
- Atualizar mocks de pagamento

### Out of Scope
- Alterar fluxo de checkout além da remoção de método de pagamento
- Modificar lógica de Carrinho ou Pedido
- Alterar infraestrutura de webhook (manter webhook PIX)
- Modificar regras de domínio de pagamento (aggregate, events, repository)
- Implementar novos meios de pagamento

## Approach

### Estratégia
1. **Remoção incremental** — Remover código Stripe em ordem inversa de dependência:
   - Presentation → Application → Infrastructure → Domain (adaptadores)
2. **Atualização do Domain por último** — `MetodoPagamento` será modificado após todas as referências serem removidas
3. **Manter testes PIX** — Apenas remover testes específicos de Stripe

### Arquivos a Modificar
| Camada | Arquivo | Ação |
|--------|---------|------|
| Presentation | `src/components/checkout/PaymentMethodSelector.tsx` | Simplificar para só PIX |
| Presentation | `src/components/checkout/CheckoutForm.tsx` | Remover lógica de cartão |
| Presentation | `src/app/api/payments/stripe/create-intent/route.ts` | Deletar |
| Presentation | `src/app/api/payments/stripe/webhook/route.ts` | Deletar |
| Presentation | `src/app/api/webhooks/stripe/route.ts` | Deletar |
| Application | `src/application/pagamento/services/CriarStripePaymentIntentUseCase.ts` | Deletar |
| Application | `src/application/pagamento/services/adapters/IStripeAdapter.ts` | Deletar |
| Infrastructure | `src/infrastructure/external/StripeAdapter.ts` | Deletar |
| Domain | `src/domain/pagamento/value-objects/MetodoPagamento.ts` | Manter só `pix` |
| Spec | `openspec/specs/payment/spec.md` | Atualizar cenários |

### Arquivos de Teste a Modificar/Remover
| Arquivo | Ação |
|---------|------|
| `tests/unit/infrastructure/payment/StripePaymentAdapter.test.ts` | Deletar |
| `tests/unit/application/payment/CriarStripePaymentIntentUseCase.test.ts` | Deletar |
| `tests/e2e/tests/payment/stripe.spec.ts` | Deletar |
| `tests/e2e/tests/payment/pix.spec.ts` | Manter (pode precisar de ajustes menores) |
| `tests/mocks/PixPaymentAdapter.mock.ts` | Manter |
| `tests/mocks/stripe.mock.ts` (se existir) | Deletar |

## Affected Areas

- **Checkout**: Fluxo de pagamento terá apenas PIX — sem seleção de método
- **Admin**: Sem impacto — visão de pedidos não depende do método de pagamento
- **Pedido**: Status `payment_failed` ainda existe para caso PIX expire/falhe
- **Webhook**: Apenas PIX webhook continua funcionando
- **Reembolso**: `IniciarReembolsoUseCase` pode precisar de ajuste — hoje suporta ambos provedores

## Risks

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Quebrar webhook PIX durante refatoração | Alto | Manter webhook route intacto até final |
| Reembolso via Stripe não funcionar após remoção | Médio | Reembolso PIX já existe; testar após remoção |
| Testes E2E de Stripe deixarem de existir | Baixo | Cobertura de PIX já existe; poucos testes são realmente críticos |
| UI de checkout quebrar após remover CardForm | Alto | Testar checkout manualmente antes de merge |

## Rollback Plan

1. **Git revert** do commit de remoção revive todo código Stripe imediatamente
2. Se deployado em produção sem Stripe funcionando: desabilitar feature flag de PIX apenas e mostrar "Pagamento indisponível"
3. Restaurar `MetodoPagamento` para incluir `credito`, `debito`

## Success Criteria

- [ ] `MetodoPagamento` contém apenas valor `pix`
- [ ] `StripeAdapter.ts` não existe no codebase
- [ ] `CriarStripePaymentIntentUseCase.ts` não existe no codebase
- [ ] Rotas `/api/payments/stripe/` não existem
- [ ] `PaymentMethodSelector` renderiza apenas opção PIX
- [ ] `CheckoutForm` não tem lógica de cartão de crédito
- [ ] `openspec/specs/payment/spec.md` atualizado — cenários Stripe removidos
- [ ] Testes unitários de Stripe removidos
- [ ] Testes E2E de Stripe removidos
- [ ] `pnpm test:unit` passa sem erros
- [ ] Build completa sem warnings de imports órfãos
