# Cobertura `tables/` (BC `mesa/`) + bug fix `qr-crypto.service.ts`

> **Status:** Proposta · **Data:** 2026-08-03 · **PR:** pendente

## 1. Contexto

O estado pós-merge do master (commit `287c620`, tag `v0.2.1`) mostra:

- Cobertura global da api caiu para **61.03% branches** (todos os 4 thresholds CI quebrados).
- O módulo `apps/api/src/tables/` (BC `mesa/` migrado para NestJS) tem apenas **9.41% statements e 2.63% branches** — é o gap mais óbvio e foi mergeado sem testes.
- A auditoria ACHADO-38 (re-varredura 7) corrigiu a vulnerabilidade de enumeração em `validateQrCode` mas a cobertura do caminho crítico de HMAC é inexistente.

Esta PR ataca prioritariamente o gap de `tables/` e **descobre um bug latente** de produção em `qr-crypto.service.ts` (`RangeError` ao receber hex inválido no payload).

## 2. Por que não foi feito antes

A migração DDD das mesas para NestJS (~436 linhas em `apps/api/src/tables/`) chegou no master via `c01c42a → cf6b39e` mas sem commit de testes correspondente. O autor priorizou features; cobertura foi deixada como "depois".

## 3. O que esta PR faz

### 3.1 Cobertura de `tables/` (3 specs novos)

| Arquivo | Linhas | Testes | % stmts / branches |
|---|---|---|---|
| `apps/api/tests/unit/tables/tables.service.spec.ts` | **45 testes** | 100% / 96.66% |
| `apps/api/tests/unit/tables/qr-crypto.service.spec.ts` | **14 testes** | 100% / 97.5% |
| `apps/api/tests/unit/tables/tables.controller.spec.ts` | **15 testes** | 100% / 100% |
| **TOTAL `tables/`** | **74 testes** | **95.4% / 92.85%** |

### 3.2 Bug fix encontrado durante a cobertura

**`qr-crypto.service.ts:44`** — `crypto.timingSafeEqual(a, b)` lança `RangeError: Input buffers must have the same byte length` quando `a` (input do atacante com hex inválido como `'zz...zz'`) tem `length === 0` (Buffer vazio). Antes desta PR:
- Atacante envia `'table_id': 'qualquer' + signature: 'z'*64`.
- `validarAssinatura` chega ao `timingSafeEqual(a, b)` com `a.length=0` e `b.length=32`.
- Exception vaza para o handler NestJS como `500 Internal Server Error` — vetor de DoS e/ou confusão operacional.

**Correção adicionada:**
```ts
if (a.length !== b.length || a.length === 0) {
  return false;
}
return crypto.timingSafeEqual(a, b);
```

### 3.3 Cobertura específica por método

**`TablesService` (45 testes):**
- `findByRestaurant` — 5 testes: `null`/`undefined`/`''`/happy/lista vazia
- `findById` — 5 testes: NotFound / BOLA cross-tenant / requester null / requester undefined / happy
- `validateQrCode` — 9 testes: secret ausente, NaN, tipo errado, janela antiga/futura, sig errada, happy, restaurante difere, mesa difere
- `assinarQrCode` — 2 testes: secret ausente → null, happy
- `validateTable` — 4 testes: ativa, inexistente, outro rest, inativa
- `validateQrAndGet` — 4 testes: mêsa inativa, sig inválida, happy, msg genérica
- `create` — 3 testes: null, com número/cap, sem número/cap
- `update` — 4 testes: NotFound, BOLA, happy, requester null
- `deactivate` — 2 testes: NotFound, happy
- `reactivate` — 2 testes: NotFound, happy
- `generateQrCode` — 5 testes: QR_BASE_URL, APP_PUBLIC_URL, fallback dev, NotFound, alias camel/snake

**`QRCodeCryptoService` (14 testes):**
- `gerarAssinatura` — 5 testes: hex 64 chars, determinístico, ts distintos, secrets distintos, compatibilidade direta com `crypto.createHmac`
- `validarAssinatura` — 8 testes: happy, sig errada, length mismatch, **hex inválido** (bug repro), restaurante alterado, mesa alterada, ts alterado, secret alterado
- round-trip — 1 teste parametrizado em 3 timestamps

**`TablesController` (15 testes):**
- 7 endpoints autenticados: delegação correta + propagação de erro
- `validateQrCode` (público): happy, nome null→`Mesa N`, msg genérica para 2 erros distintos, log warning estruturado, todos os campos do body

### 3.4 Resultado global

| Métrica api | Antes | Depois (com cobertura só de `tables/`) | Δ |
|---|---|---|---|
| Statements | 68.58% | 71.11% | +2.53pp |
| **Branches** | **61.03%** | **62.97%** | **+1.94pp** |
| Functions | 58.14% | 62.05% | +3.91pp |
| Lines | 69.12% | 71.75% | +2.63pp |

⚠️ **Cobertura global api ainda abaixo dos 80% CI.** O gap remanescente vem de outros módulos não-cobertos: `orders.service` (47.61%), `menu/menu.service` (30%), `subscriptions` (10%), `queues` (56%). PRs dedicadas são necessárias para cada.

### 3.5 Não-objetivos (out of scope)

- **Não** cobrir `orders/`, `menu/`, `subscriptions/`, `queues` — outros BCs, escopo dedicado em PRs futuras (`test(orders): ...`, `test(subscriptions): ...`).
- **Não** mexer em `users.controller.ts` (3.22% — gap de LGPD) — já tem `users.service.spec.ts` mas o `controller` ainda é órfão.
- **Não** mexer em `tables/dto/tables.dto.ts` (DTO puro gerado, não testável por unidade).

## 4. Categorias

- **Primária:** `testes` (coverage gap)
- **Secundária:** `segurança` (bug fix do `qr-crypto.service.ts: RangeError`)

## 5. Risco de Cagan

- **value**: alto — destrava cobertura CI parcial + corrige bug latente de produção
- **usability**: N/A
- **feasibility**: muito alta — schema conhecido, mocks simples
- **business-viability**: crítico — sem isso, módulo `mesa/` (core do produto) está exposto a bug + DoS

## 6. Framework de priorização — ICE

- **Impact**: 8/10 — destrava parcialmente CI + corrige bug vetor DoS
- **Confidence**: 10/10 — branches determinísticas + bug repro confiável
- **Ease**: 9/10 — escopo contido em 1 BC
- **ICE** = 8 × 10 × 9 / 10 = **72/100**

## 7. Critérios de aceite verificáveis

- [x] 3 arquivos spec criados: `tables.service.spec.ts`, `qr-crypto.service.spec.ts`, `tables.controller.spec.ts`
- [x] **74/74 testes passando** em isolado
- [x] Cobertura `tables/` global ≥95% em stmts/lines/funcs e ≥90% em branches
- [x] Cobertura `qr-crypto.service.ts` 100% em stmts/lines/funcs e ≥90% branches
- [x] Cobertura `tables.service.ts` 100% em stmts/lines/funcs e ≥90% branches
- [x] Cobertura `tables.controller.ts` 100% em todos os 4 thresholds
- [x] **Bug fix `qr-crypto.service.ts:44` — RangeError resolvido**
- [x] `pnpm --filter @pedi-ai/api test` passa: **55 specs, 817 testes** (vs 53/743 antes)
- [x] Lint sem novos warnings
- [x] Conventional Commits: `test(mesa): cobrir tables/ + fix(qr-crypto): RangeError`

## 8. Métrica de sucesso pós-merge

- **Cobertura** `tables/`: ≥95% em todos os thresholds (mantida pós-merge)
- **Operacional**: zero 500s no `/tables/validate` (erro vira `400/401` corretamente)
- **Scan seguranca**: nenhum novo CVE introduzido (fix é puramente defensivo)

## 9. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Bug fix quebrar contratos existentes | `validarAssinatura` continua retornando boolean — `false` em vez de exception mantém compatibilidade |
| Acoplamento ao secret de teste | Tests usam `process.env.QR_SECRET_KEY` reset por `beforeEach` |
| Cobertura global ainda abaixo de 80% | Documentado honestamente no PR; PRs seguintes dedicadas |

## 10. Ligações

- **Gap origem:** estado pós-merge do master `287c620` (v0.2.1) — `tables/` apenas 9.41%
- **Auditoria origem:** `docs/auditorias/DEVSECOPS-AUDIT-2026-06-25.md` (gate CI); docs/auditorias/AUDITORIA-2026-07-29-FASES-1-4-RESULTADOS.md §F0-CRIT-02
- **Padrão**: `tests/unit/<bc>/<service>.spec.ts` (replicável para `orders/`, `subscriptions/`, `menu/`, `queues`)
- **Bug fix relacionado**: `qr-crypto.service.ts:44` — `timingSafeEqual` length-mismatch (similar a `payments.controller.ts` `validateHmacSignatureV1` que JÁ tinha essa defesa — cópia feita parcialmente)
