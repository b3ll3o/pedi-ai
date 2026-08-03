# Tasks — Cobertura `payments.service.ts` branches ≥80%

## Task 1: Criar spec de cobertura

**Files:**

- Create: `apps/api/tests/unit/payments/payments.service.coverage.spec.ts`

- [x] 20 cenários cobrindo branches em `handleWebhook` (L280-417) + `getPaymentStatus` + `getPaymentStatusByOrder` + `createPixPayment` (L78-99, 155-189, 199-243, 367-401)
- [x] Mock padrão idêntico ao `payments.service.spec.ts` (consistência)
- [x] `pnpm exec vitest run tests/unit/payments/payments.service.coverage.spec.ts` → 20/20 passando

## Task 2: Validar impacto na cobertura geral

- [x] `cd apps/api && pnpm run test:cov`
- [x] Global `branches`: 79.02% → **80.92%** ✅ (acima do threshold CI)
- [x] `payments.service.ts` `branches`: 53.57% → **82.73%** (+29pp)

## Task 3: Validar pré-push

- [x] `pnpm --filter @pedi-ai/api test` → 39 specs, 603 testes passando
- [x] `pnpm --filter @pedi-ai/api lint` → 0 erros, 0 warnings novos
- [x] Conventional Commits: `test(payments): ...`

## Task 4: Push & PR

- [ ] `git fetch origin master && git rebase origin/master`
- [ ] `git push -u origin test/payments-coverage-processar-webhook`
- [ ] Abrir PR via web (gh sem auth no sandbox):
      https://github.com/b3ll3o/pedi-ai/compare/master...test/payments-coverage-processar-webhook
- [ ] Body referencia o change folder + auditoria origem
