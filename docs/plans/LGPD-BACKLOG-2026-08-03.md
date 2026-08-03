# Plano de execução do backlog LGPD (pós-auditoria 2026-08-03)

> **Origem:** [Auditoria "revise tudo" — 03/08/2026](../../.openspec/changes/2026-08-03-lgpd-me-export-delete/)
> **Escopo:** 7 itens de follow-up identificados pelo code-reviewer agent após o merge de `feat/lgpd-me-export-delete` e `test/payments-coverage-processar-webhook`.
> **Owner:** time backend
> **Estimativa total:** ~6h30 (P2) + ~4h15 (P3) = **~10h45**

---

## 1. Contexto

A auditoria de 2026-08-03 ([commit `287c620`](https://github.com/b3ll3o/pedi-ai/commit/287c620)) fechou os **3 achados críticos** (RTM inconsistente, validação de `JwtAuthGuard` global, e BOLA por `req.user.id`). Permaneceram **7 achados importantes** e **7 sugestões** que não bloqueiam produção, mas devem ser endereçados em janelas curtas para evitar acúmulo de tech-debt.

Este plano organiza o trabalho em **4 ondas** sequenciais, cada uma fechável em um único PR.

---

## 2. Backlog priorizado

### 🔵 Onda 1 — Higienização rápida (P2, ~30 min, 1 PR)

#### T1.1 — Corrigir typo `auditoria抽样` no `proposal.md`

- **Arquivo:** `.openspec/changes/2026-08-03-lgpd-me-export-delete/proposal.md:101`
- **Esforço:** 5 min
- **Critério de aceite:** string lida como "auditoria amostral" em pt-BR
- **Validação:** `grep -n "auditoria" .openspec/changes/2026-08-03-lgpd-me-export-delete/proposal.md` retorna apenas pt-BR

#### T1.2 — Documentar `Order.customerId` preservado em `anonymizeOwnAccount`

- **Arquivo:** `apps/api/src/users/lgpd.service.ts:191-196` (docblock)
- **Esforço:** 10 min
- **Critério de aceite:** nota explícita no JSDoc explicando que `Order.customerId` permanece apontando para o perfil anonimizado (FK válida, não `NULL`) para preservar trilha fiscal
- **Validação:** `git diff` mostra adição textual; lint passa

#### T1.3 — Ofuscar `userId` em logs pós-anonimização

- **Arquivos:**
  - `apps/api/src/users/lgpd.service.ts:142-145` (log `metric=lgpd.export`)
  - `apps/api/src/users/lgpd.service.ts:209, 250-252` (logs `metric=lgpd.delete`)
- **Esforço:** 15 min
- **Mudança:** criar helper `hashUserId(userId: string): string` que retorna `sha256(userId).slice(0, 12)` e usar em todos os logs LGPD
- **Critério de aceite:** nenhum log emite `userId=<uuid>` cru; sempre `<userHash12>`
- **Validação:** `grep -E "userId=\$|userId=[0-9a-f-]{36}" apps/api/src/users/lgpd.service.ts` retorna vazio

---

### 🟢 Onda 2 — Consolidação técnica (P2, ~1h15, 1 PR)

#### T2.1 — Trocar `$transaction` por `withEncryptedTransaction` em `LgpdService.anonymizeOwnAccount`

- **Arquivo:** `apps/api/src/users/lgpd.service.ts:219-248`
- **Esforço:** 15 min
- **Contexto:** padronizar com `handleWebhookInternal` (`payments.service.ts:311`) que já usa o wrapper LGPD (P0-06)
- **Mudança:**
  ```ts
  await this.prisma.withEncryptedTransaction(async (tx) => { ... });
  ```
  com `isolationLevel: 'Serializable'` (mesma config do webhook)
- **Critério de aceite:**
  - `grep -n "\\\$transaction" apps/api/src/users/lgpd.service.ts` retorna 0 ocorrências
  - testes existentes continuam passando
  - mock do `LgpdService` em `lgpd.service.spec.ts` é atualizado para `withEncryptedTransaction` (5 callsites)
- **Validação:** `pnpm --filter @pedi-ai/api test` → 742+ passed

#### T2.2 — Adicionar teste com PII criptografada em `exportUserData`

- **Arquivo:** `apps/api/tests/unit/users/lgpd.service.spec.ts` (novo describe)
- **Esforço:** 1h
- **Contexto:** garantir que o caminho `Order.customerName/customerEmail/customerPhone` (criptografados por `pii-crypto.service.ts:55-57`) é decriptado pela extension Prisma e devolvido no export
- **Cenário de teste:**
  - mockar `order.findMany` retornando `customerName: "encrypted_blob_v1..."` (formato do `pii-crypto`)
  - verificar que o `LgpdService` devolve o valor descriptografado (a extension é injetada no `tx` via `PrismaService`)
- **Critério de aceite:** novo `it('exporta PII criptografada de Order decriptada pela extension', ...)` passa
- **Validação:** cobertura `lgpd.service.ts` mantém ≥85%

---

### 🟡 Onda 3 — Cobertura de integração (P3, ~3h, 1 PR)

#### T3.1 — Teste de integração BOLA/rate limit em `DELETE /users/me`

- **Arquivo novo:** `apps/api/tests/integration/users/lgpd-endpoint.int-spec.ts`
- **Esforço:** 3h
- **Contexto:** garantir que o guard global + rate limit funcionam ponta-a-ponta com supertest + NestJS testing module
- **Cenários de teste:**
  1. `GET /users/me/export` **sem JWT** → 401
  2. `GET /users/me/export` **com JWT válido** → 200 + body com `legalBasis: 'LGPD art. 18, V'`
  3. `DELETE /users/me` **4ª chamada em 1h** → 429 (rate limit 3/h)
  4. `DELETE /users/me` **com JWT de outro user** → aplica apenas no próprio (BOLA-safe via `req.user.id`)
- **Critério de aceite:**
  - suíte roda em CI (`pnpm --filter @pedi-ai/api test:int`)
  - todos os 4 cenários passam
  - relatório HTML de cobertura mostra `users.controller.ts` ≥80%
- **Validação:** `pnpm --filter @pedi-ai/api test:int` → 4+ passed

---

### 🟣 Onda 4 — Padronização (P3, ~1h15, 1 PR)

#### T4.1 — Mover `@spec(RF-XXX-NN)` para constantes tipadas

- **Arquivos:**
  - criar `packages/shared/src/specs.ts` com `export const SPEC = { RF_AUTH_12: 'RF-AUTH-12', RF_AUTH_13: 'RF-AUTH-13' } as const`
  - atualizar `lgpd.service.ts:24`, `users.controller.ts:88,112` e demais `@spec(...)` do monorepo
- **Esforço:** 1h15
- **Benefício:** evita typos (`RF-AUTH-12` vs `RF-AUT-12`), permite find-references, dá autocomplete
- **Critério de aceite:**
  - `grep -rn "@spec(" apps/ | grep -v packages/shared | grep -v ".d.ts"` retorna apenas usos de `SPEC.RF_*`
  - `pnpm rtm` continua reconhecendo os RFs
  - `pnpm --filter @pedi-ai/api lint` → 0 errors
- **Validação:** RTM regenerada mantém 0 Missing

---

## 3. Ordem de execução

```
Onda 1 (P2) ──► Onda 2 (P2) ──► Onda 4 (P3) ──► Onda 3 (P3)
   ~30min         ~1h15            ~1h15          ~3h
```

**Justificativa da ordem:**

- **Onda 1** é "housekeeping" puro: 3 mudanças cosméticas que cabem em um único PR
- **Onda 2** endireita padrões internos (wrapper LGPD, teste PII) — depende da Onda 1 ter fechado o backlog textual
- **Onda 4** é refator de DX que pode ser feito em paralelo com a Onda 3
- **Onda 3** é a mais cara e fica por último (teste integration exige mais setup de DB + JWT mock factory)

**Recomendação de empacotamento:**

- PR #1: Onda 1 (1 commit por tarefa, ou squash)
- PR #2: Onda 2
- PR #3: Ondas 3 + 4 juntas (refator + teste integration no mesmo PR facilita review)

---

## 4. Métricas de conclusão (Definition of Done)

- [ ] `pnpm test` (root) → 2781+ passed, 0 failed, 0 regressões
- [ ] `pnpm --filter @pedi-ai/api lint` → 0 errors
- [ ] `pnpm rtm` → 0 RFs `🔴 Missing`
- [ ] Cobertura `lgpd.service.ts` ≥ 85% linhas
- [ ] Cobertura `users.controller.ts` ≥ 80% linhas
- [ ] Nenhum `userId=<uuid>` cru em logs (verificado por grep)
- [ ] `git log origin/master..HEAD --oneline` ≤ 4 commits no ciclo total
- [ ] OpenSpec `proposal.md` da LGPD recebe append de seção "Follow-up auditado" referenciando este plano

---

## 5. Riscos e mitigações

| Risco                                                             | Mitigação                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| T2.1 quebrar suíte de `LgpdService` por mudança de mock           | Atualizar `lgpd.service.spec.ts` na mesma PR; rodar `pnpm --filter @pedi-ai/api test` antes de push                 |
| T2.2 falhar por mock incorreto da extension PII                   | Verificar primeiro o shape do retorno em `pii-crypto.service.ts`; pedir review do `dba-prisma-specialist` se dúvida |
| T3.1 exigir Postgres real (não mock)                              | Usar testcontainers já presente em `apps/api/tests/integration/`; documentar no README do diretório                 |
| T4.1 quebrar RTM se constantes não forem resolvidas em build-time | Manter regex `@spec(<const>)` no script de geração; validar com `pnpm rtm` antes de merge                           |

---

## 6. Não-objetivos

- **Migração completa do `users/` para DDD** (criar `LgpdRepository` em `infrastructure/`) — coberto pelo roadmap `docs/guides/DDD_MIGRACAO_API.md`, fora do escopo deste backlog.
- **Implementar E2E Playwright para LGPD** — requer cookie HttpOnly + fluxo de auth completo, é PR dedicada.
- **Mover LGPD para OpenFeature flag** (kill-switch) — futuro, após product validar uso real.

---

## 7. Referências

- **Auditoria origem:** conversa "revise tudo" de 2026-08-03
- **OpenSpec change:** `.openspec/changes/2026-08-03-lgpd-me-export-delete/`
- **Code reviewer output:** 17 achados, 3 críticos já resolvidos
- **PR mergeado:** [1d64fd0](https://github.com/b3ll3o/pedi-ai/commit/1d64fd0) (LGPD), [c01c42a](https://github.com/b3ll3o/pedi-ai/commit/c01c42a) (coverage)
- **LGPD art. 18, V e VI:** [Lei 13.709/2018](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- **Padrão P0-06 (withEncryptedTransaction):** `apps/api/src/common/prisma.service.ts:154-175`
