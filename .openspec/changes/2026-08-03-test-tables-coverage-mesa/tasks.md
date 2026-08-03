# Tasks — Cobertura `tables/` (BC `mesa/`)

## Task 1: Criar specs de cobertura

**Files:**
- Create: `apps/api/tests/unit/tables/qr-crypto.service.spec.ts`
- Create: `apps/api/tests/unit/tables/tables.service.spec.ts`
- Create: `apps/api/tests/unit/tables/tables.controller.spec.ts`

- [x] 14 cenários em `qr-crypto.service.spec.ts` (gerar + validar + round-trip)
- [x] 45 cenários em `tables.service.spec.ts` (find/create/update/deactivate/reactivate/validate/generate)
- [x] 15 cenários em `tables.controller.spec.ts` (7 endpoints + validateQrCode com 6 variantes)
- [x] `pnpm exec vitest run tests/unit/tables/` → 74/74 passando

## Task 2: Aplicar bug fix descoberto durante cobertura

**Files:**
- Modify: `apps/api/src/tables/qr-crypto.service.ts` (linha 44)

- [x] Adicionar defesa `if (a.length !== b.length || a.length === 0) return false` antes de `timingSafeEqual`
- [x] Comentário referenciando a auditoria ACHADO-34 (payments.controller.ts tem defesa análoga)
- [x] Validar com teste "hex inválido" passando (74/74 ✓)

## Task 3: Validar impacto na cobertura geral

- [x] `cd apps/api && pnpm run test:cov`
- [x] `tables/` 9.41%/2.63% → **95.4%/92.85%**
- [x] Global api 61.03% → 62.97% branches (+1.94pp)
- [x] Suite completa: 55 specs, 817 testes (+74 testes novos)

## Task 4: Validar pré-push

- [x] `pnpm --filter @pedi-ai/api test` → 55 specs, 817 testes passando
- [x] `pnpm --filter @pedi-ai/api lint` → 0 erros, 0 warnings novos nos meus arquivos
- [x] Conventional Commits: header ≤ 100 chars

## Task 5: Push & PR

- [ ] `git fetch origin master && git rebase origin/master`
- [ ] `git push -u origin test/tables-coverage-mesa`
- [ ] Abrir PR via web (gh sem auth no sandbox)
- [ ] Body referencia o change folder + auditoria origem + bug fix descoberto
