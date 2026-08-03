# Tasks — Conectar `PaymentsService` ao `PixGateway` real (P0-07)

> Steps checkboxes para acompanhamento. Cada step é auto-contido e commita
> atômico por área (não misturar module + service + tests no mesmo commit).

## Pré-requisitos

- [ ] Branch `fix/payment-pix-real-gateway` criada a partir de `master`
- [ ] `git status` limpo (sem arquivos untracked de outras features)

---

## Task 1: `PaymentsModule` registra o provider

**Files**:

- Modify: `apps/api/src/payments/payments.module.ts`

- [ ] Adicionar import de `pixGatewayProvider`
- [ ] Adicionar `pixGatewayProvider` ao array `providers`
- [ ] Adicionar `pixGatewayProvider` ao array `exports`
- [ ] Verificar que `pnpm --filter @pedi-ai/api lint` continua 0 erros

## Task 2: `PaymentsService` injeta e usa o gateway

**Files**:

- Modify: `apps/api/src/payments/payments.service.ts`

- [ ] Adicionar import `Inject` (de `@nestjs/common`)
- [ ] Adicionar import `PIX_GATEWAY`, `PixGateway` de `./infrastructure/pix-gateway`
- [ ] Adicionar `@Inject(PIX_GATEWAY) private readonly pixGateway: PixGateway` ao construtor
- [ ] Deletar função `buildPixStubPayload` (linhas 31-56) e seu JSDoc
- [ ] Dentro da `$transaction`, substituir bloco `buildPixStubPayload + qrCode url + update{qrCode}` por:
  - `await this.pixGateway.createPixCharge({...})` → recebe `charge`
  - `tx.paymentIntent.update({...qrCode, qrCodeBase64, mercadoPagoPaymentId})`
- [ ] Atualizar retorno para incluir `qrCodeBase64`
- [ ] Verificar `grep -n "buildPixStubPayload\|api.qrserver.com\|PEDI-AI STUB" apps/api/src/payments/payments.service.ts` retorna vazio

## Task 3: Teste de unidade para `createPixPayment`

**Files**:

- Create: `apps/api/tests/unit/payments/payments.service.spec.ts`

- [ ] Mockar `PrismaService` (com `$transaction`) e `PixGateway`
- [ ] Test: gateway retorna charge válida → QR + base64 + MP id persistidos
- [ ] Test: gateway lança erro → transaction rollback, NotFound/Forbidden preservado
- [ ] Test: tenant check — order de outro restaurante → ForbiddenException
- [ ] Verificar cobertura do arquivo `payments.service.ts` ≥85% no relatório

## Task 4: Atualizar spec baseline do BC `pagamento`

**Files**:

- Modify: `.openspec/specs/pagamento/design.md`

- [ ] Atualizar linha de `RF-PAY-01` para apontar para o caminho real
      (`payments.service.ts` + `mercadopago-pix.gateway.ts`)
- [ ] Adicionar nota inline: "(P0-07 fechado 2026-08-01)"

## Task 5: Regenerar RTM

- [ ] Executar `pnpm rtm` no root
- [ ] Commitar `docs/requirements/RTM.md` se houver diff

## Task 6: Validar pré-push

- [ ] `pnpm --filter @pedi-ai/api lint` → 0 erros
- [ ] `pnpm --filter @pedi-ai/api test` → todos passam
- [ ] `pnpm test:coverage` (root) → ≥80% em todas as métricas
- [ ] `grep -rn "buildPixStubPayload" apps/` → vazio
- [ ] `git log origin/master..HEAD --oneline` → exatamente 1 commit (ou os
      separados por área, conforme tasks 1-5)

## Task 7: Push & PR

- [ ] `git fetch origin master && git rebase origin/master`
- [ ] `git push -u origin fix/payment-pix-real-gateway`
- [ ] Abrir PR via `gh pr create` (ou via REST se gh sem auth)
- [ ] Body do PR referencia este change (`/.openspec/changes/2026-08-01-pix-gateway-real/`)
      e o achado P0-07 da auditoria (`PLANO_AUDITORIA_2026-07-29.md §2.1`)
