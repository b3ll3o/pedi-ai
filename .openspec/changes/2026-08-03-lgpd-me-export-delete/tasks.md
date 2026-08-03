# Tasks — LGPD `/users/me/export` + `DELETE /users/me`

## Pré-requisitos

- [x] Branch `fix/webhook-event-unique-constraint` rebobinada para `master`
      (esta task é em branch nova `feat/lgpd-me-export-delete`)
- [x] `.openspec/changes/2026-08-03-lgpd-me-export-delete/{proposal,design}.md`
      commitados na branch

## Task 1: Criar `LgpdService`

**Files:**

- Create: `apps/api/src/users/lgpd.service.ts`

- [ ] Service com `exportUserData(userId: string)` que retorna JSON agregado
- [ ] Service com `anonymizeOwnAccount(userId: string)` em `$transaction`
- [ ] Idempotência em `anonymizeOwnAccount` (segunda call = noop)
- [ ] Verificar `pnpm --filter @pedi-ai/api lint` 0 erros

## Task 2: Adicionar endpoints no `UsersController`

**Files:**

- Modify: `apps/api/src/users/users.controller.ts`

- [ ] `GET /users/me/export` → `LgpdService.exportUserData(req.user.id)`
- [ ] `DELETE /users/me` → `LgpdService.anonymizeOwnAccount(req.user.id)`
- [ ] `DELETE /users/me` com `@Throttle({ default: { limit: 3, ttl: 3_600_000 } })`
- [ ] `@ApiTags('users')` em ambos
- [ ] Swagger doc em ambos

## Task 3: Testes unitários

**Files:**

- Create: `apps/api/tests/unit/users/lgpd.service.spec.ts`

Cenários obrigatórios:

- [ ] `exportUserData` retorna objeto com `subject`, `orders`, `paymentIntents`,
      `refreshTokens`, `passwordResetTokens`, `subscriptions`
- [ ] `exportUserData` lança `NotFoundException` se user não existe
- [ ] `anonymizeOwnAccount` anonimiza email/name e zera passwordHash
- [ ] `anonymizeOwnAccount` revoga TODOS os refresh tokens ativos
- [ ] `anonymizeOwnAccount` invalida password reset tokens em aberto
- [ ] `anonymizeOwnAccount` **não toca** Orders/PaymentIntents
- [ ] `anonymizeOwnAccount` é idempotente (segunda call não falha)
- [ ] Cobertura do `lgpd.service.ts` ≥85%

## Task 4: Atualizar spec baseline

**Files:**

- Modify: `.openspec/specs/autenticacao/design.md`

- [ ] Adicionar `RF-AUTH-12` e `RF-AUTH-13` à tabela
- [ ] Adicionar RNF-LGPD-01..03
- [ ] Marcar change como `✅ Aplicada` no `proposal.md` quando merged

## Task 5: Regenerar RTM

- [ ] Executar `pnpm rtm`
- [ ] Commitar `docs/requirements/RTM.md` se houver diff

## Task 6: Validar pré-push

- [ ] `pnpm --filter @pedi-ai/api lint` → 0 erros
- [ ] `pnpm --filter @pedi-ai/api test` → todos passam
- [ ] `pnpm test:coverage` (root) → ≥80% em todas métricas
- [ ] `git log origin/master..HEAD --oneline` → exatamente 1 commit (ou separados)

## Task 7: Push & PR

- [ ] `git fetch origin master && git rebase origin/master`
- [ ] `git push -u origin feat/lgpd-me-export-delete`
- [ ] Abrir PR via web (gh sem auth no sandbox):
      https://github.com/b3ll3o/pedi-ai/compare/master...feat/lgpd-me-export-delete
- [ ] Body do PR referencia este change e auditoria P1-3
